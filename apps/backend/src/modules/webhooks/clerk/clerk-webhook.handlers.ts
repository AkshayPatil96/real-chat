import { WebhookEvent } from '@clerk/express';
import { UserService } from '../../users/index.js';

/**
 * Handler for user.created event
 */
export async function handleUserCreated(data: WebhookEvent['data'] | any) {
  try {
    const userData = {
      username: (data.first_name + ' ' + data.last_name).trim() || data.username! || 'User',
      email: data.email_addresses[0]?.email_address || '',
      avatar: data.image_url,
    };

    await UserService.upsertUser(data.id, userData);
    console.log(`✅ User created via webhook: ${data.id}`);
  } catch (error) {
    console.error('❌ Error in handleUserCreated:', error);
    throw error;
  }
}

/**
 * Handler for user.updated event
 */
export async function handleUserUpdated(data: WebhookEvent['data'] | any) {
  try {
    const userData = {
      username: (data.first_name + ' ' + data.last_name).trim() || data.username! || 'User',
      email: data.email_addresses[0]?.email_address || '',
      avatar: data.image_url,
    };

    await UserService.upsertUser(data.id, userData);
    console.log(`✅ User updated via webhook: ${data.id}`);
  } catch (error) {
    console.error('❌ Error in handleUserUpdated:', error);
    throw error;
  }
}

/**
 * Handler for user.deleted event
 */
export async function handleUserDeleted(data: WebhookEvent['data'] | any) {
  try {
    await UserService.deleteAccountByClerkId(data.id);
    console.log(`✅ User deleted via webhook: ${data.id}`);
  } catch (error) {
    console.error('❌ Error in handleUserDeleted:', error);
    throw error;
  }
}