type Deps = {
  storage: any;
  checkAdminAccess: (user: any, tenantId: string) => Promise<boolean>;
  checkFlyVoiceProxyHealth: () => Promise<{ healthy: boolean; details?: any }>;
  calculateNextAvailableCallTime: (hoursStr: string, state: string) => Date | null;
  callDispatcher: { processImmediately: () => Promise<void> };
};

export function createBatchCallHandler(deps: Deps) {
  const {
    storage,
    checkAdminAccess,
    checkFlyVoiceProxyHealth,
    calculateNextAvailableCallTime,
    callDispatcher,
  } = deps;

  return async (req: any, res: any) => {
    try {
      const userId = req.user.isPasswordAuth ? req.user.id : req.user.claims.sub;
      const user = await storage.getUser(userId);

      const isAdminUser = await checkAdminAccess(user, req.user.tenantId);
      if (!isAdminUser && !user?.hasVoiceAccess) {
        return res.status(403).json({ error: "Voice calling access required" });
      }

      const {
        agent_record_id,
        agent_id,
        phone_number_id,
        stores,
        store_data,
        scenario,
        name,
        scheduled_for,
        auto_schedule,
        ivr_behavior,
      } = req.body;
      const projectId = req.body?.projectId || null;

      if (!agent_record_id || !agent_id || !stores || !Array.isArray(stores) || stores.length === 0) {
        return res.status(400).json({ error: "Agent record ID, agent ID, and stores array required" });
      }

      const isImmediateCall = !scheduled_for && !auto_schedule;
      if (isImmediateCall) {
        const proxyHealth = await checkFlyVoiceProxyHealth();
        if (!proxyHealth.healthy) {
          return res.status(503).json({
            error: "Voice service temporarily unavailable. Please try again in a few moments.",
            details: proxyHealth.details,
          });
        }
      }

      const tenantId = (req.user as any).tenantId;
      const agent = await storage.getElevenLabsAgent(agent_record_id, tenantId);
      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }
      if (!agent.agentId || !agent.phoneNumberId) {
        return res.status(400).json({ error: "Agent configuration incomplete - missing agentId or phoneNumberId" });
      }

      if (!phone_number_id) {
        return res.status(400).json({ error: "Phone number ID required for outbound calling" });
      }

      let scheduledStart = new Date();
      if (scheduled_for) {
        scheduledStart = new Date(scheduled_for);
      }

      const campaign = await storage.createCallCampaign({
        name: name || `${scenario || "Batch"} Campaign - ${new Date().toLocaleDateString()}`,
        scenario: scenario || "custom",
        agentId: agent_record_id,
        phoneNumberId: phone_number_id,
        createdByUserId: userId,
        storeFilter: { scenario },
        totalStores: stores.length,
        status: "scheduled",
        scheduledStart,
        ivrBehavior: ivr_behavior || "flag_and_end",
        tenantId,
      });

      const storeDataMap = new Map();
      if (store_data && Array.isArray(store_data)) {
        for (const store of store_data) {
          if (store.link) {
            storeDataMap.set(store.link, store);
          }
        }
      }

      let createdTargets = 0;
      let skippedStores = 0;

      for (const storeLink of stores) {
        const isQualificationLead = storeLink.startsWith("lead:");
        let client: any = null;
        let leadId: string | null = null;
        let phoneNumber: string | null = null;

        if (isQualificationLead) {
          leadId = storeLink.replace("lead:", "");
          const lead = await storage.getQualificationLead(leadId, tenantId);
          if (!lead || !lead.pocPhone) {
            skippedStores++;
            continue;
          }

          phoneNumber = lead.pocPhone;
          await storage.updateQualificationLead(leadId, tenantId, {
            callStatus: "scheduled",
            callAttempts: (lead.callAttempts || 0) + 1,
          });

          client = await storage.getClientByUniqueIdentifier(storeLink);
          if (!client) {
            client = await storage.createClient({
              uniqueIdentifier: storeLink,
              googleSheetId: "qualification-leads",
              data: {
                Phone: lead.pocPhone,
                Name: lead.company,
                businessName: lead.company,
                state: lead.state || lead.country || "",
                pocName: lead.pocName || "",
                website: lead.website || "",
                source: "qualification_lead",
                leadId,
              },
              status: "lead",
              tenantId,
              projectId: lead.projectId || null,
            });
          }
        } else {
          client = await storage.getClientByUniqueIdentifier(storeLink);

          if (!client && storeDataMap.has(storeLink)) {
            const storeInfo = storeDataMap.get(storeLink);
            const phone = storeInfo.phone || storeInfo.Phone;
            if (!phone) {
              skippedStores++;
              continue;
            }

            client = await storage.createClient({
              uniqueIdentifier: storeLink,
              googleSheetId: storeInfo.sheetId || "unknown",
              data: storeInfo,
              status: storeInfo.status || "unassigned",
              tenantId,
              projectId,
            });
          }

          if (client) {
            const clientData = client.data as any;
            phoneNumber = clientData?.Phone || clientData?.phone;
          }
        }

        if (client && phoneNumber) {
          const targetData: any = {
            campaignId: campaign.id,
            clientId: client.id,
            targetStatus: "pending",
            attemptCount: 0,
            tenantId,
          };

          if (auto_schedule) {
            const storeInfo = storeDataMap.get(storeLink) || client.data || {};
            const hours = storeInfo.Hours || storeInfo.hours || storeInfo.businessHours || "";
            const state = storeInfo.State || storeInfo.state || "";
            if (hours && state) {
              const optimalTime = calculateNextAvailableCallTime(hours, state);
              if (optimalTime) {
                targetData.scheduledFor = optimalTime;
                targetData.nextAttemptAt = optimalTime;
              } else {
                targetData.nextAttemptAt = new Date();
              }
            } else {
              targetData.nextAttemptAt = new Date();
            }
          } else if (scheduled_for) {
            targetData.scheduledFor = scheduledStart;
            targetData.nextAttemptAt = scheduledStart;
          } else {
            targetData.nextAttemptAt = new Date();
          }

          await storage.createCallCampaignTarget(targetData);
          createdTargets++;
        } else {
          skippedStores++;
        }
      }

      if (isImmediateCall && createdTargets > 0) {
        console.log(`[BatchCall] Triggering immediate dispatch for ${createdTargets} targets`);
        callDispatcher.processImmediately().catch((err) => {
          console.error("[BatchCall] Error in immediate dispatch:", err);
        });
      }

      res.json({
        campaignId: campaign.id,
        totalStores: stores.length,
        createdTargets,
        skippedStores,
        status: isImmediateCall ? "processing" : "queued",
        autoScheduled: !!auto_schedule,
        immediate: isImmediateCall,
      });
    } catch (error: any) {
      console.error("Error creating batch call campaign:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  };
}
