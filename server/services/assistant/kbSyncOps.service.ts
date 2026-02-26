import axios from "axios";

export function createKbSyncOps(storage: any) {
  async function getAgentsUsingDocument(apiKey: string, docId: string, tenantId: string): Promise<string[]> {
    try {
      const agents = await storage.getAllElevenLabsAgents(tenantId);
      const agentIds: string[] = [];

      for (const agent of agents) {
        try {
          const response = await axios.get(`https://api.elevenlabs.io/v1/convai/agents/${agent.agentId}`, {
            headers: { "xi-api-key": apiKey },
          });

          const knowledgeBase = response.data?.conversation_config?.agent?.prompt?.knowledge_base || [];
          const usesDocument = knowledgeBase.some((kb: any) => kb.id === docId);
          if (usesDocument) agentIds.push(agent.agentId);
        } catch (error: any) {
          console.error(`[KB Sync] Error fetching agent ${agent.agentId}:`, error.message);
        }
      }

      return agentIds;
    } catch (error: any) {
      console.error("[KB Sync] Error in getAgentsUsingDocument:", error);
      throw error;
    }
  }

  async function swapAgentKbDocument(
    apiKey: string,
    agentId: string,
    oldDocId: string,
    newDocId: string
  ): Promise<void> {
    try {
      const getResponse = await axios.get(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
        headers: { "xi-api-key": apiKey },
      });

      const agentConfig = getResponse.data;
      const knowledgeBase = agentConfig?.conversation_config?.agent?.prompt?.knowledge_base || [];
      const updatedKnowledgeBase = knowledgeBase.map((kb: any) => (kb.id === oldDocId ? { ...kb, id: newDocId } : kb));

      await axios.patch(
        `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
        {
          conversation_config: {
            agent: {
              prompt: {
                knowledge_base: updatedKnowledgeBase,
              },
            },
          },
        },
        {
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error: any) {
      console.error(`[KB Sync] Error swapping document in agent ${agentId}:`, error.response?.data || error.message);
      throw error;
    }
  }

  async function syncKbDocumentToElevenLabs(
    apiKey: string,
    oldDocId: string,
    filename: string,
    newContent: string,
    tenantId: string
  ): Promise<{ success: boolean; newDocId?: string; agentsUpdated?: number; error?: string }> {
    let newDocId: string | null = null;
    const swappedAgents: string[] = [];

    try {
      const createResponse = await axios.post(
        "https://api.elevenlabs.io/v1/convai/knowledge-base/text",
        {
          name: filename,
          text: newContent,
        },
        {
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      newDocId = createResponse.data.id;
      const agentIds = await getAgentsUsingDocument(apiKey, oldDocId, tenantId);
      const swapErrors: string[] = [];

      for (const agentId of agentIds) {
        try {
          await swapAgentKbDocument(apiKey, agentId, oldDocId, newDocId as string);
          swappedAgents.push(agentId);
        } catch (error: any) {
          swapErrors.push(`Agent ${agentId}: ${error.message}`);
          break;
        }
      }

      if (swapErrors.length > 0) {
        const rollbackErrors: string[] = [];
        const rolledBackAgents: string[] = [];

        for (const agentId of swappedAgents) {
          try {
            await swapAgentKbDocument(apiKey, agentId, newDocId as string, oldDocId);
            rolledBackAgents.push(agentId);
          } catch {
            rollbackErrors.push(agentId);
          }
        }

        if (rollbackErrors.length === 0) {
          try {
            await axios.delete(`https://api.elevenlabs.io/v1/convai/knowledge-base/${newDocId}`, {
              headers: { "xi-api-key": apiKey },
            });
          } catch (deleteError) {
            console.error("[KB Sync] Warning: Failed to delete new document during rollback:", deleteError);
          }

          return {
            success: false,
            error: `Failed to swap agents: ${swapErrors.join("; ")} | Rollback successful (${rolledBackAgents.length} agents restored)`,
          };
        }

        return {
          success: false,
          error: `Failed to swap agents AND rollback partially failed. ${rollbackErrors.length} agents still reference NEW doc ${newDocId}: ${rollbackErrors.join(
            ", "
          )}. ${rolledBackAgents.length} agents restored to OLD doc ${oldDocId}. DO NOT delete either document manually - contact support.`,
        };
      }

      try {
        await axios.delete(`https://api.elevenlabs.io/v1/convai/knowledge-base/${oldDocId}`, {
          headers: { "xi-api-key": apiKey },
        });
      } catch (deleteError: any) {
        console.error(`[KB Sync] Warning: Failed to delete old document ${oldDocId}:`, deleteError.message);
      }

      return {
        success: true,
        newDocId: newDocId || undefined,
        agentsUpdated: swappedAgents.length,
      };
    } catch (error: any) {
      console.error("[KB Sync] Critical error in syncKbDocumentToElevenLabs:", error);

      if (newDocId && swappedAgents.length > 0) {
        const rollbackErrors: string[] = [];
        const rolledBackAgents: string[] = [];

        for (const agentId of swappedAgents) {
          try {
            await swapAgentKbDocument(apiKey, agentId, newDocId as string, oldDocId);
            rolledBackAgents.push(agentId);
          } catch {
            rollbackErrors.push(agentId);
          }
        }

        if (rollbackErrors.length === 0) {
          try {
            await axios.delete(`https://api.elevenlabs.io/v1/convai/knowledge-base/${newDocId}`, {
              headers: { "xi-api-key": apiKey },
            });
          } catch (cleanupError) {
            console.error("[KB Sync] Warning: Failed to delete new document:", cleanupError);
          }

          return {
            success: false,
            error: `${error.message} | Emergency rollback successful (${rolledBackAgents.length} agents restored)`,
          };
        }

        return {
          success: false,
          error: `${error.message} | CRITICAL: Emergency rollback partially failed. ${rollbackErrors.length} agents still reference NEW doc ${newDocId}: ${rollbackErrors.join(
            ", "
          )}. ${rolledBackAgents.length} agents restored to OLD doc ${oldDocId}. DO NOT delete either document manually - contact support.`,
        };
      }

      if (newDocId) {
        try {
          await axios.delete(`https://api.elevenlabs.io/v1/convai/knowledge-base/${newDocId}`, {
            headers: { "xi-api-key": apiKey },
          });
        } catch (cleanupError) {
          console.error("[KB Sync] Failed to clean up new document:", cleanupError);
        }
      }

      return {
        success: false,
        error: error.response?.data?.detail?.message || error.message || "Unknown sync error",
      };
    }
  }

  return {
    getAgentsUsingDocument,
    swapAgentKbDocument,
    syncKbDocumentToElevenLabs,
  };
}
