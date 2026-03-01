import axios from 'axios';
import { storage } from '../storage';

export async function checkSystemHealthForTenant(tenantId: string): Promise<string[]> {
  const issues: string[] = [];

  try {
    const elevenLabsConfig = await storage.getElevenLabsConfig(tenantId);
    if (!elevenLabsConfig?.apiKey) {
      issues.push('ElevenLabs API key not configured');
    }

    if (!elevenLabsConfig?.webhookSecret) {
      issues.push('ElevenLabs webhook not registered - call data will be lost');
    }

    const agents = await storage.getElevenLabsAgents(tenantId);
    if (!agents || agents.length === 0) {
      issues.push('No voice agents configured');
    }

    const phoneNumbers = await storage.getElevenLabsPhoneNumbers(tenantId);
    if (!phoneNumbers || phoneNumbers.length === 0) {
      issues.push('No Twilio phone numbers configured');
    }

    const flyProxyUrl = process.env.FLY_VOICE_PROXY_URL || 'https://hemp-voice-proxy.fly.dev';
    try {
      const proxyRes = await axios.get(`${flyProxyUrl}/health`, { timeout: 5000 });
      if (!proxyRes.data?.status || proxyRes.data.status !== 'ok') {
        issues.push('Voice proxy is not healthy');
      }
    } catch (e: any) {
      issues.push('Voice proxy is unreachable');
    }
  } catch (error: any) {
    console.error('[CallDispatcher] Health check error:', error.message);
    issues.push('Health check failed: ' + error.message);
  }

  return issues;
}

export async function checkSystemHealth(): Promise<string[]> {
  const issues: string[] = [];
  try {
    const flyProxyUrl = process.env.FLY_VOICE_PROXY_URL || 'https://hemp-voice-proxy.fly.dev';
    const proxyRes = await axios.get(`${flyProxyUrl}/health`, { timeout: 5000 });
    if (!proxyRes.data?.status || proxyRes.data.status !== 'ok') {
      issues.push('Voice proxy is not healthy');
    }
  } catch (e: any) {
    issues.push('Voice proxy is unreachable');
  }
  return issues;
}
