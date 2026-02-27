# Storage Refactor Promised Files

Backup created:
- `backups/storage.backup.2026-02-26.ts`

## Promised Storage Module Files (Mechanical Split Plan)

1. `server/storage-modules/index.ts`
2. `server/storage-modules/userStorage.ts`
3. `server/storage-modules/tenantStorage.ts`
4. `server/storage-modules/tenantMembershipStorage.ts`
5. `server/storage-modules/tenantInviteStorage.ts`
6. `server/storage-modules/pipelineStorage.ts`
7. `server/storage-modules/tenantProjectStorage.ts`
8. `server/storage-modules/assistantBlueprintStorage.ts`
9. `server/storage-modules/integrationStorage.ts`
10. `server/storage-modules/userPreferencesStorage.ts`
11. `server/storage-modules/clientStorage.ts`
12. `server/storage-modules/noteStorage.ts`
13. `server/storage-modules/orderStorage.ts`
14. `server/storage-modules/commissionStorage.ts`
15. `server/storage-modules/csvUploadStorage.ts`
16. `server/storage-modules/googleSheetStorage.ts`
17. `server/storage-modules/dashboardStorage.ts`
18. `server/storage-modules/reminderStorage.ts`
19. `server/storage-modules/notificationStorage.ts`
20. `server/storage-modules/widgetLayoutStorage.ts`
21. `server/storage-modules/openaiSettingsStorage.ts`
22. `server/storage-modules/knowledgeBaseFileStorage.ts`
23. `server/storage-modules/chatStorage.ts`
24. `server/storage-modules/projectStorage.ts`
25. `server/storage-modules/conversationStorage.ts`
26. `server/storage-modules/templateStorage.ts`
27. `server/storage-modules/userTagStorage.ts`
28. `server/storage-modules/categoryStorage.ts`
29. `server/storage-modules/importedPlacesStorage.ts`
30. `server/storage-modules/searchHistoryStorage.ts`
31. `server/storage-modules/savedExclusionStorage.ts`
32. `server/storage-modules/statusStorage.ts`
33. `server/storage-modules/ticketStorage.ts`
34. `server/storage-modules/callHistoryStorage.ts`
35. `server/storage-modules/driveFolderStorage.ts`
36. `server/storage-modules/followUpCenterStorage.ts`
37. `server/storage-modules/elevenLabsConfigStorage.ts`
38. `server/storage-modules/elevenLabsPhoneNumberStorage.ts`
39. `server/storage-modules/elevenLabsAgentStorage.ts`
40. `server/storage-modules/callSessionStorage.ts`
41. `server/storage-modules/callTranscriptStorage.ts`
42. `server/storage-modules/callEventStorage.ts`
43. `server/storage-modules/callCampaignStorage.ts`
44. `server/storage-modules/aiInsightStorage.ts`
45. `server/storage-modules/kbManagementStorage.ts`
46. `server/storage-modules/analysisJobStorage.ts`
47. `server/storage-modules/assistantManagementStorage.ts`
48. `server/storage-modules/nonDuplicateStorage.ts`
49. `server/storage-modules/backgroundAudioStorage.ts`
50. `server/storage-modules/voiceProxyStorage.ts`
51. `server/storage-modules/ehubSettingsStorage.ts`
52. `server/storage-modules/sequenceCoreStorage.ts`
53. `server/storage-modules/sequenceRecipientStorage.ts`
54. `server/storage-modules/sequenceScheduledSendStorage.ts`
55. `server/storage-modules/sequenceStepStorage.ts`
56. `server/storage-modules/sequenceRecipientMessageStorage.ts`
57. `server/storage-modules/schedulingStorage.ts` (already created)
58. `server/storage-modules/qualificationStorage.ts` (already created)
59. `server/storage-modules/emailOpsStorage.ts` (already created)
60. `server/storage-modules/testDataOpsStorage.ts` (already created)
61. `server/storage-modules/emailSenderStorage.ts` (already created)

## Execution Rule
- Mechanical extraction only: move methods verbatim, keep behavior identical, keep `IStorage` API compatibility, verify with `npx tsc --noEmit` after each batch.
