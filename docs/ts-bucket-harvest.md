# TypeScript Bucket Harvest (Phase 0)

- Source: /tmp/tsc-bucket-harvest.txt
- Total diagnostics: **414**

## Bucket A
- Count: **0**
- Codes: None

## Bucket B
- Count: **0**
- Codes: None

## Bucket C
- Count: **0**
- Codes: None

## Bucket D
- Count: **387**
- Codes: TS2339 (161), TS2345 (48), TS2322 (31), TS2769 (30), TS7006 (21), TS18048 (17), TS2551 (16), TS2353 (14), TS2554 (13), TS2367 (12), TS18049 (5), TS2461 (3), TS18046 (2), TS2323 (2), TS2393 (2), TS2552 (1), TS2454 (1), TS2741 (1), TS18047 (1), TS7031 (1), TS1501 (1), TS2740 (1), TS2739 (1), TS7022 (1), TS7024 (1)
- Samples:
  - client/src/components/ai-chat.tsx(130,28): error TS2339: Property 'length' does not exist on type '{}'.
  - client/src/components/ai-chat.tsx(131,40): error TS2339: Property 'map' does not exist on type '{}'.
  - client/src/components/ai-chat.tsx(218,18): error TS2339: Property 'hasApiKey' does not exist on type '{}'.
  - client/src/components/aligner-chat.tsx(179,61): error TS2339: Property 'length' does not exist on type '{}'.
  - client/src/components/aligner-chat.tsx(181,54): error TS2339: Property 'map' does not exist on type '{}'.
  - client/src/components/aligner-chat.tsx(228,54): error TS2339: Property 'length' does not exist on type '{}'.
  - client/src/components/aligner-chat.tsx(380,18): error TS2339: Property 'hasApiKey' does not exist on type '{}'.
  - client/src/components/aligner-management.tsx(411,38): error TS2339: Property 'hasApiKey' does not exist on type '{}'.
  - client/src/components/aligner-management.tsx(429,38): error TS2339: Property 'hasApiKey' does not exist on type '{}'.
  - client/src/components/aligner-management.tsx(477,23): error TS2339: Property 'hasApiKey' does not exist on type '{}'.
  - client/src/components/category-management.tsx(357,25): error TS2367: This comparison appears to be unintentional because the types 'number' and 'string' have no overlap.
  - client/src/components/color-customizer.tsx(130,21): error TS2345: Argument of type 'ThemeColors' is not assignable to parameter of type 'SetStateAction<{ statusColors: { [x: string]: { background: string; text: string; } | { background: string; text: string; }; }; background: string; text: string; tableTextColor?: string | undefined; primary: string; ... 9 more ...; actionButtons?: string | undefined; }>'.

## Bucket E
- Count: **27**
- Codes: TS2802 (24), TS7016 (3)
- Samples:
  - client/src/pages/call-manager.tsx(449,42): error TS2802: Type 'Set<any>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher.
  - client/src/pages/client-dashboard.tsx(4255,42): error TS2802: Type 'Set<unknown>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher.
  - client/src/pages/map-search.tsx(1116,23): error TS2802: Type 'Set<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher.
  - client/src/vendor/react-best-gradient-color-picker/components/Square.tsx(6,22): error TS7016: Could not find a declaration file for module 'lodash.throttle'. '/Users/mike/CRM/node_modules/lodash.throttle/index.js' implicitly has an 'any' type.
  - server/audio-converter.ts(3,27): error TS7016: Could not find a declaration file for module 'ffprobe-static'. '/Users/mike/CRM/node_modules/ffprobe-static/index.js' implicitly has an 'any' type.
  - server/backfill-contact-dates.ts(58,50): error TS2802: Type 'MapIterator<[string, Date]>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher.
  - server/googleMaps.ts(1,19): error TS7016: Could not find a declaration file for module 'node-fetch'. '/Users/mike/CRM/node_modules/node-fetch/lib/index.js' implicitly has an 'any' type.
  - server/routes/callManager/callInsightsAdmin.routes.ts(111,37): error TS2802: Type 'Set<any>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher.
  - server/runtimeConfig.ts(79,14): error TS2802: Type 'Set<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher.
  - server/services/aiTranscriptAnalysis.ts(171,24): error TS2802: Type 'Set<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher.
  - server/services/aiTranscriptAnalysis.ts(176,24): error TS2802: Type 'Set<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher.
  - server/services/aiTranscriptAnalysis.ts(220,19): error TS2802: Type 'Set<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher.
