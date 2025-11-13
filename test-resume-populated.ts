// Test: Resume paused recipient when queue already has 10 emails
import { storage } from './server/storage';
import { db } from './server/db';
import { sequenceRecipients } from './shared/schema';
import { addMinutes, addHours } from 'date-fns';

async function testResumeWithPopulatedQueue() {
  console.log('=== Test: Resume paused recipient with 10 emails queued ===\n');
  
  const sequenceId = 'b1bc90d5-f7ba-4511-a173-f5f84a1c272c';
  const testRecipients: any[] = [];
  
  // Clean up any previous test data
  await db.delete(sequenceRecipients);
  
  // Create 10 recipients scheduled at 1-minute intervals starting from now
  const baseTime = new Date();
  for (let i = 0; i < 10; i++) {
    const nextSendAt = addMinutes(baseTime, i + 1);
    testRecipients.push({
      sequenceId,
      email: `queued-${i + 1}@example.com`,
      name: `Queued Recipient ${i + 1}`,
      businessHours: '9:00 AM - 5:00 PM',
      timezone: 'America/New_York',
      status: 'pending',
      currentStep: 0,
      nextSendAt,
      lastStepSentAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  
  // Insert all 10 recipients
  await db.insert(sequenceRecipients).values(testRecipients);
  console.log(`Created 10 recipients scheduled from ${baseTime.toISOString()}`);
  
  // Get the last scheduled time (position #10)
  const [lastQueued] = await db
    .select()
    .from(sequenceRecipients)
    .orderBy((t: any) => t.nextSendAt)
    .limit(10)
    .then((rows: any[]) => rows.slice(-1));
  
  console.log(`Last queued recipient (#10): ${lastQueued.email}`);
  console.log(`  Scheduled at: ${lastQueued.nextSendAt.toISOString()}\n`);
  
  // Create paused recipient
  const [pausedRecipient] = await db.insert(sequenceRecipients).values({
    sequenceId,
    email: 'test-resume-populated@example.com',
    name: 'Test Resume Populated',
    businessHours: '9:00 AM - 5:00 PM',
    timezone: 'America/New_York',
    status: 'paused',
    currentStep: 0,
    nextSendAt: null,
    lastStepSentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  
  console.log(`Created paused recipient: ${pausedRecipient.email}`);
  console.log(`  Status: ${pausedRecipient.status}`);
  console.log(`  Next Send At: ${pausedRecipient.nextSendAt || 'null'}\n`);
  
  // Resume the paused recipient
  console.log('Resuming paused recipient...\n');
  const resumed = await storage.resumeRecipient(pausedRecipient.id);
  
  console.log('Resumed recipient:');
  console.log(`  Email: ${resumed.email}`);
  console.log(`  Status: ${resumed.status}`);
  console.log(`  Next Send At: ${resumed.nextSendAt?.toISOString()}\n`);
  
  // Verify it's scheduled AFTER the last queued recipient
  if (resumed.nextSendAt && lastQueued.nextSendAt) {
    const resumedTime = resumed.nextSendAt.getTime();
    const lastQueuedTime = lastQueued.nextSendAt.getTime();
    const gapMinutes = Math.round((resumedTime - lastQueuedTime) / 60000);
    
    console.log(`Gap between #10 and resumed: ${gapMinutes} minutes`);
    
    if (resumedTime > lastQueuedTime) {
      console.log(`✅ PASS: Resumed recipient scheduled AFTER position #10`);
      console.log(`  #10: ${lastQueued.nextSendAt.toISOString()}`);
      console.log(`  #11: ${resumed.nextSendAt.toISOString()}`);
    } else {
      console.error(`❌ FAIL: Resumed recipient NOT scheduled after #10`);
      console.error(`  #10: ${lastQueued.nextSendAt.toISOString()}`);
      console.error(`  #11: ${resumed.nextSendAt.toISOString()}`);
    }
  } else {
    console.error('❌ FAIL: Missing nextSendAt timestamps');
  }
  
  process.exit(0);
}

testResumeWithPopulatedQueue();
