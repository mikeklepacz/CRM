import { storage } from './storage';
import type { InsertAnalysisJob, AnalysisJob } from '@shared/schema';
import OpenAI from 'openai';
import axios from 'axios';

const CALLS_PER_BATCH = 2; // Process 2 calls at a time
const OPENAI_POLL_INTERVAL = 2500; // 2.5 seconds between polls (was 500ms)

let isProcessing = false;

export async function startJobProcessor() {
  if (isProcessing) {
    console.log('[Job Processor] Already processing, skipping...');
    return;
  }

  isProcessing = true;

  try {
    const queuedJob = await storage.getRunningAnalysisJob();
    
    if (!queuedJob) {
      // Check for queued jobs
      const queued = await storage.getAnalysisJobs({ status: 'queued', limit: 1 });
      
      if (queued.length === 0) {
        isProcessing = false;
        return;
      }

      const job = queued[0];
      await processJob(job.id);
    }
  } catch (error) {
    console.error('[Job Processor] Error:', error);
  } finally {
    isProcessing = false;
  }
}

async function processJob(jobId: string) {
  try {
    const job = await storage.getAnalysisJob(jobId);
    
    if (!job) {
      console.error(`[Job Processor] Job ${jobId} not found`);
      return;
    }

    // Mark as running
    await storage.updateAnalysisJob(jobId, {
      status: 'running',
      startedAt: new Date(),
    });

    console.log(`[Job Processor] Starting job ${jobId} - ${job.type} analysis for ${job.agentId || 'all'}`);

    // Get Aligner assistant
    const alignerAssistant = await storage.getAssistantBySlug('aligner');
    if (!alignerAssistant || !alignerAssistant.assistantId) {
      throw new Error('Aligner assistant not configured');
    }

    // Get OpenAI API key
    const openaiSettings = await storage.getOpenAISettings();
    if (!openaiSettings?.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const openai = new OpenAI({ apiKey: openaiSettings.apiKey });

    // Get KB files for this agent
    const isAllAgents = job.agentId === 'all' || !job.agentId;
    const allKbFiles = await storage.getAllKbFiles();
    const kbFiles = isAllAgents
      ? allKbFiles.filter(file => file.agentId == null)
      : allKbFiles.filter(file => file.agentId === job.agentId || file.agentId == null);

    if (kbFiles.length === 0) {
      throw new Error('No KB files found for this agent');
    }

    // Get calls to analyze
    const callsData = await storage.getCallsWithTranscripts({
      agentId: isAllAgents ? undefined : job.agentId,
      onlyUnanalyzed: true,
      limit: job.totalCalls,
    });

    if (callsData.length === 0) {
      await storage.updateAnalysisJob(jobId, {
        status: 'completed',
        completedAt: new Date(),
        currentCallIndex: job.totalCalls,
      });
      console.log(`[Job Processor] Job ${jobId} completed - no calls to analyze`);
      return;
    }

    // Get Wick Coach insight if available
    let insight = null;
    if (job.insightId) {
      insight = await storage.getAiInsightById(job.insightId);
    }

    // Process calls in batches
    let totalProposalsCreated = 0;

    for (let i = 0; i < callsData.length; i += CALLS_PER_BATCH) {
      const batchCalls = callsData.slice(i, Math.min(i + CALLS_PER_BATCH, callsData.length));
      const batchNumber = Math.floor(i / CALLS_PER_BATCH) + 1;
      const totalBatches = Math.ceil(callsData.length / CALLS_PER_BATCH);

      console.log(`[Job Processor] Processing batch ${batchNumber}/${totalBatches} (calls ${i + 1}-${i + batchCalls.length} of ${callsData.length})`);

      // Build transcript context for this batch
      const transcriptContext = batchCalls
        .filter(call => call.transcripts && call.transcripts.length > 0)
        .map((call, idx) => {
          const fullTranscript = call.transcripts
            .map(t => `${t.role}: ${t.message}`)
            .join('\n');
          const storeInfo = call.client.data?.Name ? ` (Store: ${call.client.data.Name})` : '';
          return `\n#### Call ${i + idx + 1}${storeInfo}\n- Duration: ${call.session.callDurationSecs || 'N/A'}s\n- Outcome: ${call.session.status}\n- Interest Level: ${call.session.interestLevel || 'N/A'}\n- Transcript:\n\`\`\`\n${fullTranscript}\n\`\`\``;
        })
        .join('\n');

      // Build KB context
      const kbContext = kbFiles
        .map(file => `\n### ${file.filename}\n\`\`\`\n${file.currentContent || '(empty)'}\n\`\`\``)
        .join('\n');

      // Build Wick Coach section if available
      let wickCoachSection = '';
      if (insight) {
        const objections = insight.objections
          .map(obj => `- ${obj.objection} (frequency: ${obj.frequency})`)
          .join('\n');
        const patterns = insight.patterns
          .map(pat => `- ${pat.pattern} (frequency: ${pat.frequency})`)
          .join('\n');
        const recommendations = insight.recommendations
          .map(rec => `- [${rec.priority.toUpperCase()}] ${rec.title}: ${rec.description}`)
          .join('\n');

        wickCoachSection = `

----

## WICK COACH ANALYSIS:
**Date Range:** ${insight.dateRangeStart} to ${insight.dateRangeEnd}
**Total Calls:** ${insight.callCount}
**Sentiment:** ${insight.sentimentPositive} positive, ${insight.sentimentNeutral} neutral, ${insight.sentimentNegative} negative

**Common Objections Identified:**
${objections || '(none)'}

**Success Patterns Identified:**
${patterns || '(none)'}

**Wick Coach Recommendations:**
${recommendations || '(none)'}`;
      }

      // Load task prompt template from database and substitute variables
      let analysisPrompt = alignerAssistant.taskPromptTemplate || '';
      
      // If template is empty, fall back to default (should not happen in production)
      if (!analysisPrompt) {
        console.warn('[Job Processor] Task prompt template is empty, using fallback');
        analysisPrompt = 'You are the Aligner assistant. Analyze the transcripts and KB files to propose improvements.';
      }

      // Substitute template variables based on insight presence
      const variables: Record<string, string> = {
        transcriptContext,
        kbContext,
        wickCoachSection,
        insightIntro: insight ? ' You have TWO sources of information:' : ' You have access to:',
        wickCoachIntro: insight ? '\n2. **WICK COACH ANALYSIS** - Another AI (the "Wick Coach") has already analyzed these calls and provided recommendations' : '',
        dualPerspective: insight ? 'DUAL-PERSPECTIVE ' : '',
        synthesisSection: insight 
          ? '**Second, review the Wick Coach\'s analysis** to see if it caught things you missed or has different insights.\n\n**Then, synthesize BOTH perspectives** to propose KB improvements that address:\n- Issues YOU identified from transcripts\n- Valid points from the Wick Coach\'s recommendations\n- Any contradictions between the two analyses (explain your reasoning)' 
          : '**Then, propose KB improvements** based on your analysis of the transcripts.',
        analysisSource: insight ? 'BOTH your transcript analysis AND the Wick Coach\'s insights' : 'your analysis of the transcripts',
        wickCoachCitation: insight ? '\n   - Relevant Wick Coach recommendations' : '',
      };

      // Replace all variables in template
      for (const [key, value] of Object.entries(variables)) {
        analysisPrompt = analysisPrompt.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }

      // Call OpenAI Assistant with JSON mode
      const thread = await openai.beta.threads.create({
        messages: [{ role: 'user', content: analysisPrompt }],
      });

      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: alignerAssistant.assistantId,
        response_format: { type: 'json_object' }, // Enforce JSON mode
      });

      // Poll for completion with respectful 2.5s interval
      let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      let pollCount = 0;
      const maxPolls = 120; // 5 minutes max (120 * 2.5s)

      while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
        pollCount++;
        if (pollCount > maxPolls) {
          throw new Error('OpenAI assistant timeout - exceeded 5 minutes');
        }

        await new Promise(resolve => setTimeout(resolve, OPENAI_POLL_INTERVAL));
        runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      }

      if (runStatus.status !== 'completed') {
        throw new Error(`OpenAI assistant run failed: ${runStatus.status}`);
      }

      // Get the response
      const messages = await openai.beta.threads.messages.list(thread.id);
      const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
      
      if (!assistantMessage) {
        throw new Error('No response from assistant');
      }

      const responseText = assistantMessage.content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text.value)
        .join('\n');

      // Parse JSON response
      let analysisResult;
      try {
        analysisResult = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[Job Processor] Failed to parse JSON response:', responseText);
        throw new Error('Invalid JSON response from assistant');
      }

      // Create proposals for each edit
      const edits = analysisResult.edits || [];
      
      for (const edit of edits) {
        const kbFile = kbFiles.find(f => f.filename === edit.file);
        
        if (!kbFile) {
          console.warn(`[Job Processor] KB file not found: ${edit.file}`);
          continue;
        }

        // Get latest version for optimistic locking
        const versions = await storage.getKbFileVersions(kbFile.id);
        const latestVersion = versions.sort((a, b) => 
          new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
        )[0];

        if (!latestVersion) {
          console.warn(`[Job Processor] No versions found for file: ${edit.file}`);
          continue;
        }

        // Apply string replacement to generate proposed content
        let proposedContent = latestVersion.content;
        
        if (edit.old && edit.old.trim() !== '') {
          // Replace exact match
          if (!proposedContent.includes(edit.old)) {
            console.warn(`[Job Processor] Old text not found in ${edit.file} - skipping edit`);
            continue;
          }
          proposedContent = proposedContent.replace(edit.old, edit.new);
        } else {
          // Append new content
          proposedContent = proposedContent + '\n\n' + edit.new;
        }

        // Build rationale from edit details
        const rationale = `**Section:** ${edit.section}

**Reason:** ${edit.reason}

**Evidence:** ${edit.evidence}

**Principle:** ${edit.principle}

**Change:** Replace "${edit.old.substring(0, 100)}${edit.old.length > 100 ? '...' : ''}" with "${edit.new.substring(0, 100)}${edit.new.length > 100 ? '...' : ''}"`;

        // Create proposal
        await storage.createKbProposal({
          kbFileId: kbFile.id,
          baseVersionId: latestVersion.id,
          proposedContent,
          rationale,
          aiInsightId: job.insightId || null,
          status: 'pending',
        });

        totalProposalsCreated++;
      }

      // Mark calls as analyzed
      for (const call of batchCalls) {
        await storage.updateCallSession(call.session.id, {
          lastAnalyzedAt: new Date(),
        });
      }

      // Update job progress
      await storage.updateAnalysisJob(jobId, {
        currentCallIndex: Math.min(i + CALLS_PER_BATCH, callsData.length),
        proposalsCreated: totalProposalsCreated,
      });

      console.log(`[Job Processor] Batch ${batchNumber}/${totalBatches} complete - ${edits.length} proposals created`);
    }

    // Job complete
    await storage.updateAnalysisJob(jobId, {
      status: 'completed',
      completedAt: new Date(),
      currentCallIndex: callsData.length,
      proposalsCreated: totalProposalsCreated,
    });

    console.log(`[Job Processor] Job ${jobId} completed - ${totalProposalsCreated} total proposals created`);

  } catch (error: any) {
    console.error(`[Job Processor] Job ${jobId} failed:`, error);
    
    await storage.updateAnalysisJob(jobId, {
      status: 'failed',
      completedAt: new Date(),
      errorMessage: error.message || 'Unknown error',
    });
  }
}
