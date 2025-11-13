// Quick test script for resumeRecipient queue coordinator integration
import { storage } from './server/storage';

async function testResumeWithEmptyQueue() {
  console.log('=== Test: Resume paused recipient with empty queue ===');
  
  const recipientId = '66c612f4-6b5f-4817-bd87-f6d77d0a3d89';
  const beforeResume = new Date();
  
  console.log(`Before resume: ${beforeResume.toISOString()}`);
  
  try {
    // Resume the recipient
    const resumed = await storage.resumeRecipient(recipientId);
    
    console.log('\nResumed recipient:');
    console.log(`  Email: ${resumed.email}`);
    console.log(`  Status: ${resumed.status}`);
    console.log(`  Current Step: ${resumed.currentStep}`);
    console.log(`  Next Send At: ${resumed.nextSendAt?.toISOString()}`);
    console.log(`  Last Step Sent At: ${resumed.lastStepSentAt?.toISOString() || 'null'}`);
    
    if (resumed.nextSendAt) {
      const scheduledInMinutes = Math.round((resumed.nextSendAt.getTime() - beforeResume.getTime()) / 60000);
      console.log(`\nScheduled ${scheduledInMinutes} minutes from now`);
      
      // Verify it's scheduled soon (within next few hours, not days away)
      const maxReasonableMinutes = 60 * 24; // 24 hours max for empty queue
      if (scheduledInMinutes > maxReasonableMinutes) {
        console.error(`❌ FAIL: Scheduled too far in future (${scheduledInMinutes} min > ${maxReasonableMinutes} min)`);
      } else {
        console.log(`✅ PASS: Scheduled within reasonable window (${scheduledInMinutes} min)`);
      }
    } else {
      console.error('❌ FAIL: nextSendAt is null after resume');
    }
    
  } catch (error: any) {
    console.error('Error during resume:', error.message);
  }
  
  process.exit(0);
}

testResumeWithEmptyQueue();
