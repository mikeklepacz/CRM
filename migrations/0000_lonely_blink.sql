CREATE TABLE "ai_insight_objections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"insight_id" varchar NOT NULL,
	"objection" text NOT NULL,
	"frequency" integer NOT NULL,
	"example_conversations" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_insight_patterns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"insight_id" varchar NOT NULL,
	"pattern" text NOT NULL,
	"frequency" integer NOT NULL,
	"example_conversations" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_insight_recommendations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"insight_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"priority" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_insights" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analyzed_at" timestamp DEFAULT now(),
	"date_range_start" timestamp,
	"date_range_end" timestamp,
	"agent_id" varchar,
	"call_count" integer NOT NULL,
	"sentiment_positive" integer,
	"sentiment_neutral" integer,
	"sentiment_negative" integer,
	"sentiment_trends_text" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "analysis_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'queued' NOT NULL,
	"agent_id" varchar,
	"total_calls" integer NOT NULL,
	"current_call_index" integer DEFAULT 0,
	"proposals_created" integer DEFAULT 0,
	"insight_id" varchar,
	"triggered_by" varchar NOT NULL,
	"started_by" varchar,
	"error_message" text,
	"created_at" timestamp DEFAULT now(),
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "background_audio_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_name" varchar(255),
	"file_path" varchar(512),
	"volume_db" integer DEFAULT -25 NOT NULL,
	"uploaded_at" timestamp,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "call_campaign_targets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" varchar NOT NULL,
	"client_id" varchar NOT NULL,
	"call_session_id" varchar,
	"target_status" varchar(50) DEFAULT 'pending',
	"scheduled_for" timestamp,
	"attempt_count" integer DEFAULT 0,
	"next_attempt_at" timestamp,
	"external_conversation_id" varchar,
	"last_error" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "call_campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"scenario" varchar(50),
	"agent_id" varchar NOT NULL,
	"created_by_user_id" varchar NOT NULL,
	"store_filter" jsonb,
	"total_stores" integer DEFAULT 0,
	"status" varchar(50) DEFAULT 'scheduled' NOT NULL,
	"ivr_behavior" varchar(50) DEFAULT 'flag_and_end',
	"scheduled_start" timestamp,
	"completed_at" timestamp,
	"calls_completed" integer DEFAULT 0,
	"calls_successful" integer DEFAULT 0,
	"calls_failed" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "call_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"status" varchar(50),
	"payload" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "call_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"store_name" varchar(255) NOT NULL,
	"phone_number" varchar(50) NOT NULL,
	"store_link" varchar(500),
	"called_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "call_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar,
	"call_sid" varchar,
	"agent_id" varchar NOT NULL,
	"client_id" varchar NOT NULL,
	"initiated_by_user_id" varchar,
	"phone_number" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'initiated' NOT NULL,
	"call_duration_secs" integer,
	"cost_credits" integer,
	"started_at" timestamp DEFAULT now(),
	"ended_at" timestamp,
	"last_analyzed_at" timestamp,
	"ai_analysis" jsonb,
	"call_successful" boolean,
	"interest_level" varchar(20),
	"follow_up_needed" boolean DEFAULT false,
	"follow_up_date" timestamp,
	"next_action" text,
	"store_snapshot" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "call_sessions_conversation_id_unique" UNIQUE("conversation_id")
);
--> statement-breakpoint
CREATE TABLE "call_transcripts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"role" varchar(20) NOT NULL,
	"message" text NOT NULL,
	"time_in_call_secs" integer,
	"tool_calls" jsonb,
	"tool_results" jsonb,
	"metrics" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"conversation_id" varchar,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"response_id" varchar,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unique_identifier" varchar,
	"google_sheet_id" varchar,
	"google_sheet_row_id" integer,
	"data" jsonb NOT NULL,
	"assigned_agent" varchar,
	"claim_date" timestamp,
	"last_contact_date" timestamp,
	"status" varchar(50) DEFAULT 'unassigned',
	"category" varchar(100),
	"tags" text[] DEFAULT ARRAY[]::text[],
	"first_order_date" timestamp,
	"last_order_date" timestamp,
	"total_sales" numeric(12, 2) DEFAULT '0',
	"commission_total" numeric(12, 2) DEFAULT '0',
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "commissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" varchar NOT NULL,
	"agent_id" varchar NOT NULL,
	"commission_kind" varchar(20) NOT NULL,
	"source_agent_id" varchar,
	"amount" numeric(12, 2) NOT NULL,
	"commission_rate" numeric(5, 2),
	"commission_date" timestamp NOT NULL,
	"calculated_on" timestamp DEFAULT now(),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"project_id" varchar,
	"title" varchar(300) NOT NULL,
	"assistant_type" varchar(50) DEFAULT 'sales',
	"context_data" jsonb,
	"thread_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "csv_uploads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" varchar NOT NULL,
	"uploaded_by" varchar NOT NULL,
	"unique_key" varchar NOT NULL,
	"headers" jsonb NOT NULL,
	"row_count" integer NOT NULL,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dashboard_cards" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"card_type" varchar(50) NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"visible_to_roles" text[] DEFAULT ARRAY['admin']::text[],
	"is_active" boolean DEFAULT true,
	"display_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "drive_folders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"folder_id" varchar NOT NULL,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "drive_folders_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "ehub_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"min_delay_minutes" integer DEFAULT 1 NOT NULL,
	"max_delay_minutes" integer DEFAULT 3 NOT NULL,
	"daily_email_limit" integer DEFAULT 200 NOT NULL,
	"sending_hours_start" integer DEFAULT 9 NOT NULL,
	"sending_hours_end" integer DEFAULT 14 NOT NULL,
	"client_window_start_offset" numeric(4, 2) DEFAULT '1.00' NOT NULL,
	"client_window_end_hour" integer DEFAULT 14 NOT NULL,
	"prompt_injection" text,
	"keyword_bin" text,
	"skip_weekends" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	"updated_by" varchar
);
--> statement-breakpoint
CREATE TABLE "elevenlabs_agents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"agent_id" varchar(255) NOT NULL,
	"phone_number_id" varchar(255),
	"description" text,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "elevenlabs_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key" text NOT NULL,
	"phone_number_id" varchar(255),
	"twilio_number" varchar(50),
	"webhook_secret" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "elevenlabs_phone_numbers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_number_id" varchar(255) NOT NULL,
	"phone_number" varchar(50) NOT NULL,
	"label" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "elevenlabs_phone_numbers_phone_number_id_unique" UNIQUE("phone_number_id")
);
--> statement-breakpoint
CREATE TABLE "email_drafts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"client_link" varchar(500),
	"recipient_email" varchar(255) NOT NULL,
	"subject" varchar(500),
	"body_preview" text,
	"method" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "google_sheets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spreadsheet_id" varchar NOT NULL,
	"spreadsheet_name" varchar NOT NULL,
	"sheet_name" varchar NOT NULL,
	"sheet_purpose" varchar(100) DEFAULT 'clients',
	"unique_identifier_column" varchar NOT NULL,
	"connected_by" varchar NOT NULL,
	"last_synced_at" timestamp,
	"sync_status" varchar(50) DEFAULT 'active',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "imported_places" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"place_id" varchar(255) NOT NULL,
	"imported_at" timestamp DEFAULT now(),
	CONSTRAINT "imported_places_place_id_unique" UNIQUE("place_id")
);
--> statement-breakpoint
CREATE TABLE "kb_change_proposals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kb_file_id" varchar NOT NULL,
	"base_version_id" varchar NOT NULL,
	"proposed_content" text NOT NULL,
	"original_ai_content" text,
	"human_edited" boolean DEFAULT false NOT NULL,
	"rationale" text,
	"ai_insight_id" varchar,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"applied_version_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"reviewed_at" timestamp,
	"reviewed_by" varchar
);
--> statement-breakpoint
CREATE TABLE "kb_file_versions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kb_file_id" varchar NOT NULL,
	"version_number" integer NOT NULL,
	"content" text NOT NULL,
	"source" varchar(50) NOT NULL,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "kb_files" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"elevenlabs_doc_id" varchar,
	"filename" varchar(255) NOT NULL,
	"current_content" text,
	"current_sync_version" varchar,
	"agent_id" varchar(255),
	"sync_state" varchar(20) DEFAULT 'local_only' NOT NULL,
	"locked" boolean DEFAULT false,
	"file_type" varchar(50) DEFAULT 'file',
	"local_updated_at" timestamp DEFAULT now(),
	"elevenlabs_updated_at" timestamp,
	"last_synced_source" varchar(20),
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "kb_files_elevenlabs_doc_id_unique" UNIQUE("elevenlabs_doc_id"),
	CONSTRAINT "kb_files_filename_unique" UNIQUE("filename")
);
--> statement-breakpoint
CREATE TABLE "knowledge_base_files" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" varchar(255) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" varchar(100),
	"openai_file_id" varchar(100),
	"uploaded_by" varchar NOT NULL,
	"category" varchar(100) DEFAULT 'general',
	"product_category" varchar(100),
	"description" text,
	"processing_status" varchar(50) DEFAULT 'uploading',
	"is_active" boolean DEFAULT true,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "non_duplicates" (
	"id" integer PRIMARY KEY NOT NULL,
	"link1" text NOT NULL,
	"link2" text NOT NULL,
	"marked_by_user_id" varchar,
	"marked_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"content" text NOT NULL,
	"is_follow_up" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"client_id" varchar,
	"reminder_id" varchar,
	"order_id" varchar,
	"notification_type" varchar(50) NOT NULL,
	"title" varchar(200) NOT NULL,
	"message" text NOT NULL,
	"priority" varchar(20) DEFAULT 'normal',
	"is_read" boolean DEFAULT false,
	"is_resolved" boolean DEFAULT false,
	"resolved_at" timestamp,
	"email_sent" boolean DEFAULT false,
	"email_sent_at" timestamp,
	"action_url" varchar(500),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "openai_assistant_files" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assistant_id" varchar NOT NULL,
	"filename" varchar(255) NOT NULL,
	"openai_file_id" varchar,
	"file_size" integer,
	"uploaded_by" varchar,
	"category" varchar(100),
	"uploaded_at" timestamp DEFAULT now(),
	"last_synced_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "openai_assistants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"assistant_id" varchar,
	"vector_store_id" varchar,
	"instructions" text NOT NULL,
	"task_prompt_template" text,
	"model" varchar(50) DEFAULT 'gpt-4o',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "openai_assistants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "openai_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key" text,
	"ai_instructions" text,
	"vector_store_id" varchar,
	"assistant_id" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar PRIMARY KEY NOT NULL,
	"client_id" varchar,
	"order_number" varchar NOT NULL,
	"billing_email" varchar,
	"billing_company" varchar,
	"sales_agent_name" varchar,
	"total" numeric(12, 2) NOT NULL,
	"status" varchar(50) NOT NULL,
	"order_date" timestamp NOT NULL,
	"commission_type" varchar(20) DEFAULT 'auto',
	"commission_amount" numeric(12, 2),
	"synced_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"client_id" varchar,
	"title" varchar(200) NOT NULL,
	"description" text,
	"reminder_type" varchar(50) NOT NULL,
	"scheduled_date" varchar(10) NOT NULL,
	"scheduled_time" varchar(5) NOT NULL,
	"timezone" varchar(100) NOT NULL,
	"trigger_date" timestamp,
	"interval_days" integer,
	"last_triggered" timestamp,
	"next_trigger" timestamp,
	"scheduled_at_utc" timestamp,
	"reminder_time_zone" varchar(100),
	"due_date" timestamp,
	"is_active" boolean DEFAULT true,
	"is_completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"send_email" boolean DEFAULT true,
	"add_to_calendar" boolean DEFAULT false,
	"email_template" varchar(50) DEFAULT 'default',
	"custom_email_subject" varchar(200),
	"custom_email_body" text,
	"google_calendar_event_id" varchar,
	"store_metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reschedule_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" varchar(50) DEFAULT 'running' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"total_processed" integer DEFAULT 0,
	"error_log" text,
	"settings_snapshot" jsonb
);
--> statement-breakpoint
CREATE TABLE "saved_exclusions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(20) NOT NULL,
	"value" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "search_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_type" text NOT NULL,
	"category" varchar(100),
	"city" text NOT NULL,
	"state" text NOT NULL,
	"country" text NOT NULL,
	"excluded_keywords" text[] DEFAULT ARRAY[]::text[],
	"excluded_types" text[] DEFAULT ARRAY[]::text[],
	"searched_at" timestamp DEFAULT now(),
	"search_count" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sequence_recipient_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" varchar NOT NULL,
	"step_number" integer NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"sent_at" timestamp DEFAULT now(),
	"thread_id" varchar,
	"message_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sequence_recipients" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sequence_id" varchar NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"link" varchar(500),
	"sales_summary" text,
	"business_hours" text,
	"timezone" varchar(100),
	"client_id" varchar,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"current_step" integer DEFAULT 0,
	"last_step_sent_at" timestamp,
	"next_send_at" timestamp,
	"sent_at" timestamp,
	"replied_at" timestamp,
	"reply_count" integer DEFAULT 0,
	"thread_id" varchar,
	"error_log" text,
	"bounce_type" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sequence_scheduled_sends" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" varchar NOT NULL,
	"sequence_id" varchar NOT NULL,
	"step_number" integer NOT NULL,
	"repeat_index" integer DEFAULT 0 NOT NULL,
	"eligible_at" timestamp NOT NULL,
	"scheduled_at" timestamp,
	"jitter_minutes" numeric(10, 4),
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp,
	"thread_id" varchar,
	"message_id" varchar,
	"subject" text,
	"body" text,
	"error_log" text,
	"retry_attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sequence_steps" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sequence_id" varchar NOT NULL,
	"step_number" integer NOT NULL,
	"delay_days" numeric(10, 4) NOT NULL,
	"ai_guidance" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sequences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"strategy_transcript" jsonb,
	"step_delays" numeric(10, 4)[],
	"repeat_last_step" boolean DEFAULT false,
	"prompt_injection" text,
	"keywords" text,
	"signature" text,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"created_by" varchar NOT NULL,
	"last_sent_at" timestamp,
	"total_recipients" integer DEFAULT 0,
	"sent_count" integer DEFAULT 0,
	"failed_count" integer DEFAULT 0,
	"replied_count" integer DEFAULT 0,
	"bounced_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "statuses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_order" integer NOT NULL,
	"light_bg_color" varchar(7) NOT NULL,
	"light_text_color" varchar(7) NOT NULL,
	"dark_bg_color" varchar(7) NOT NULL,
	"dark_text_color" varchar(7) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "statuses_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "system_integrations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(50) NOT NULL,
	"google_client_id" varchar,
	"google_client_secret" varchar,
	"google_access_token" text,
	"google_refresh_token" text,
	"google_token_expiry" bigint,
	"google_email" varchar,
	"connected_by" varchar,
	"connected_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "system_integrations_provider_unique" UNIQUE("provider")
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" varchar(200) NOT NULL,
	"content" text NOT NULL,
	"type" varchar(20) DEFAULT 'Email',
	"tags" text[] DEFAULT ARRAY[]::text[],
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "test_data_nuke_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"executed_by" varchar NOT NULL,
	"email_pattern" varchar(255),
	"recipients_deleted" integer DEFAULT 0 NOT NULL,
	"messages_deleted" integer DEFAULT 0 NOT NULL,
	"test_emails_deleted" integer DEFAULT 0 NOT NULL,
	"executed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "test_email_sends" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_email" varchar(255) NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"gmail_thread_id" varchar,
	"gmail_message_id" varchar,
	"rfc822_message_id" varchar,
	"status" varchar(50) DEFAULT 'sent' NOT NULL,
	"sent_at" timestamp,
	"last_checked_at" timestamp,
	"reply_detected_at" timestamp,
	"follow_up_count" integer DEFAULT 0,
	"last_follow_up_at" timestamp,
	"error_message" text,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ticket_replies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"subject" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"category" varchar(50) DEFAULT 'General Question' NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"priority" varchar(20) DEFAULT 'normal',
	"last_reply_at" timestamp,
	"is_unread_by_admin" boolean DEFAULT true NOT NULL,
	"is_unread_by_user" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "twilio_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_number" varchar(50),
	"is_configured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_integrations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"woo_url" text,
	"woo_consumer_key" text,
	"woo_consumer_secret" text,
	"woo_last_synced_at" timestamp,
	"google_calendar_access_token" text,
	"google_calendar_refresh_token" text,
	"google_calendar_token_expiry" bigint,
	"google_calendar_email" varchar,
	"google_calendar_connected_at" timestamp,
	"google_calendar_webhook_channel_id" varchar,
	"google_calendar_webhook_resource_id" varchar,
	"google_calendar_webhook_expiry" bigint,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_integrations_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"visible_columns" jsonb,
	"column_order" jsonb,
	"column_widths" jsonb,
	"selected_states" jsonb,
	"selected_cities" jsonb,
	"font_size" integer DEFAULT 14,
	"row_height" integer DEFAULT 48,
	"light_mode_colors" jsonb,
	"dark_mode_colors" jsonb,
	"has_light_overrides" boolean DEFAULT false,
	"has_dark_overrides" boolean DEFAULT false,
	"color_presets" jsonb DEFAULT '[]'::jsonb,
	"color_row_by_status" boolean DEFAULT false,
	"text_align" varchar(20),
	"freeze_first_column" boolean DEFAULT false,
	"auto_kb_analysis" boolean DEFAULT false,
	"kb_analysis_threshold" integer DEFAULT 10,
	"loading_logo_url" text,
	"timezone" varchar(100),
	"default_timezone_mode" varchar(20) DEFAULT 'agent',
	"time_format" varchar(10) DEFAULT '12hr',
	"default_calendar_reminders" jsonb DEFAULT '[{"method":"popup","minutes":0}]'::jsonb,
	"active_excluded_keywords" text[] DEFAULT ARRAY[]::text[],
	"active_excluded_types" text[] DEFAULT ARRAY[]::text[],
	"last_category" varchar(100),
	"selected_category" varchar(100),
	"auto_load_script" boolean DEFAULT true,
	"view_as_agent" boolean DEFAULT false,
	"split_screen_proposals" boolean DEFAULT false,
	"follow_up_filters" jsonb DEFAULT '{"claimedDays":[7,90],"interestedDays":[14,90],"reorderDays":[30,180]}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_tags" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"tag" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"username" varchar,
	"password_hash" varchar,
	"role" varchar(20) DEFAULT 'agent' NOT NULL,
	"agent_name" varchar,
	"phone" varchar,
	"meeting_link" text,
	"referred_by" varchar,
	"is_active" boolean DEFAULT true NOT NULL,
	"has_voice_access" boolean DEFAULT false NOT NULL,
	"signature" text,
	"gmail_labels" text[],
	"email_preference" varchar(20) DEFAULT 'mailto',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "voice_proxy_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stream_sid" varchar(255) NOT NULL,
	"agent_id" varchar(255),
	"call_sid" varchar(255),
	"status" varchar(50) DEFAULT 'active',
	"started_at" timestamp DEFAULT now(),
	"ended_at" timestamp,
	CONSTRAINT "voice_proxy_sessions_stream_sid_unique" UNIQUE("stream_sid")
);
--> statement-breakpoint
CREATE TABLE "widget_layouts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"dashboard_type" varchar(50) DEFAULT 'sales' NOT NULL,
	"layout_name" varchar(100),
	"layout_config" jsonb NOT NULL,
	"visible_widgets" jsonb,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "ai_insight_objections" ADD CONSTRAINT "ai_insight_objections_insight_id_ai_insights_id_fk" FOREIGN KEY ("insight_id") REFERENCES "public"."ai_insights"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_insight_patterns" ADD CONSTRAINT "ai_insight_patterns_insight_id_ai_insights_id_fk" FOREIGN KEY ("insight_id") REFERENCES "public"."ai_insights"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_insight_recommendations" ADD CONSTRAINT "ai_insight_recommendations_insight_id_ai_insights_id_fk" FOREIGN KEY ("insight_id") REFERENCES "public"."ai_insights"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_jobs" ADD CONSTRAINT "analysis_jobs_insight_id_ai_insights_id_fk" FOREIGN KEY ("insight_id") REFERENCES "public"."ai_insights"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_campaign_targets" ADD CONSTRAINT "call_campaign_targets_campaign_id_call_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."call_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_campaign_targets" ADD CONSTRAINT "call_campaign_targets_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_campaign_targets" ADD CONSTRAINT "call_campaign_targets_call_session_id_call_sessions_id_fk" FOREIGN KEY ("call_session_id") REFERENCES "public"."call_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_campaigns" ADD CONSTRAINT "call_campaigns_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_history" ADD CONSTRAINT "call_history_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_initiated_by_user_id_users_id_fk" FOREIGN KEY ("initiated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_assigned_agent_users_id_fk" FOREIGN KEY ("assigned_agent") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_source_agent_id_users_id_fk" FOREIGN KEY ("source_agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csv_uploads" ADD CONSTRAINT "csv_uploads_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drive_folders" ADD CONSTRAINT "drive_folders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ehub_settings" ADD CONSTRAINT "ehub_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_drafts" ADD CONSTRAINT "email_drafts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_sheets" ADD CONSTRAINT "google_sheets_connected_by_users_id_fk" FOREIGN KEY ("connected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_change_proposals" ADD CONSTRAINT "kb_change_proposals_kb_file_id_kb_files_id_fk" FOREIGN KEY ("kb_file_id") REFERENCES "public"."kb_files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_change_proposals" ADD CONSTRAINT "kb_change_proposals_base_version_id_kb_file_versions_id_fk" FOREIGN KEY ("base_version_id") REFERENCES "public"."kb_file_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_change_proposals" ADD CONSTRAINT "kb_change_proposals_ai_insight_id_ai_insights_id_fk" FOREIGN KEY ("ai_insight_id") REFERENCES "public"."ai_insights"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_change_proposals" ADD CONSTRAINT "kb_change_proposals_applied_version_id_kb_file_versions_id_fk" FOREIGN KEY ("applied_version_id") REFERENCES "public"."kb_file_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kb_file_versions" ADD CONSTRAINT "kb_file_versions_kb_file_id_kb_files_id_fk" FOREIGN KEY ("kb_file_id") REFERENCES "public"."kb_files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base_files" ADD CONSTRAINT "knowledge_base_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "non_duplicates" ADD CONSTRAINT "non_duplicates_marked_by_user_id_users_id_fk" FOREIGN KEY ("marked_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_reminder_id_reminders_id_fk" FOREIGN KEY ("reminder_id") REFERENCES "public"."reminders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "openai_assistant_files" ADD CONSTRAINT "openai_assistant_files_assistant_id_openai_assistants_id_fk" FOREIGN KEY ("assistant_id") REFERENCES "public"."openai_assistants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "openai_assistant_files" ADD CONSTRAINT "openai_assistant_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sequence_recipient_messages" ADD CONSTRAINT "sequence_recipient_messages_recipient_id_sequence_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."sequence_recipients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sequence_recipients" ADD CONSTRAINT "sequence_recipients_sequence_id_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."sequences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sequence_recipients" ADD CONSTRAINT "sequence_recipients_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sequence_scheduled_sends" ADD CONSTRAINT "sequence_scheduled_sends_recipient_id_sequence_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."sequence_recipients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sequence_scheduled_sends" ADD CONSTRAINT "sequence_scheduled_sends_sequence_id_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."sequences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sequence_steps" ADD CONSTRAINT "sequence_steps_sequence_id_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."sequences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sequences" ADD CONSTRAINT "sequences_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_integrations" ADD CONSTRAINT "system_integrations_connected_by_users_id_fk" FOREIGN KEY ("connected_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_data_nuke_log" ADD CONSTRAINT "test_data_nuke_log_executed_by_users_id_fk" FOREIGN KEY ("executed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_email_sends" ADD CONSTRAINT "test_email_sends_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_replies" ADD CONSTRAINT "ticket_replies_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_replies" ADD CONSTRAINT "ticket_replies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_integrations" ADD CONSTRAINT "user_integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_referred_by_users_id_fk" FOREIGN KEY ("referred_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "widget_layouts" ADD CONSTRAINT "widget_layouts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_objections_insight" ON "ai_insight_objections" USING btree ("insight_id");--> statement-breakpoint
CREATE INDEX "idx_patterns_insight" ON "ai_insight_patterns" USING btree ("insight_id");--> statement-breakpoint
CREATE INDEX "idx_recommendations_insight" ON "ai_insight_recommendations" USING btree ("insight_id");--> statement-breakpoint
CREATE INDEX "idx_ai_insights_analyzed_at" ON "ai_insights" USING btree ("analyzed_at");--> statement-breakpoint
CREATE INDEX "idx_ai_insights_agent" ON "ai_insights" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_analysis_jobs_status" ON "analysis_jobs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "idx_analysis_jobs_agent" ON "analysis_jobs" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_campaign_targets_campaign" ON "call_campaign_targets" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "idx_campaign_targets_client" ON "call_campaign_targets" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_campaign_targets_next_attempt" ON "call_campaign_targets" USING btree ("next_attempt_at");--> statement-breakpoint
CREATE INDEX "idx_campaign_targets_status" ON "call_campaign_targets" USING btree ("target_status");--> statement-breakpoint
CREATE INDEX "idx_call_campaigns_user" ON "call_campaigns" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_call_campaigns_status" ON "call_campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_call_events_conversation" ON "call_events" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_call_history_agent_date" ON "call_history" USING btree ("agent_id","called_at");--> statement-breakpoint
CREATE INDEX "idx_call_sessions_client" ON "call_sessions" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_call_sessions_user" ON "call_sessions" USING btree ("initiated_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_call_sessions_status" ON "call_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_call_sessions_started" ON "call_sessions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "idx_call_sessions_agent_analyzed" ON "call_sessions" USING btree ("agent_id","last_analyzed_at");--> statement-breakpoint
CREATE INDEX "idx_call_transcripts_conversation" ON "call_transcripts" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_chat_messages_conversation_created" ON "chat_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_commissions_agent_kind_calc" ON "commissions" USING btree ("agent_id","commission_kind","calculated_on");--> statement-breakpoint
CREATE INDEX "idx_commissions_order" ON "commissions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_commissions_source_agent" ON "commissions" USING btree ("source_agent_id");--> statement-breakpoint
CREATE INDEX "idx_conversations_user_updated" ON "conversations" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "idx_email_drafts_user_date" ON "email_drafts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_place_id" ON "imported_places" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX "idx_kb_proposals_status" ON "kb_change_proposals" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "idx_kb_proposals_file_status" ON "kb_change_proposals" USING btree ("kb_file_id","status");--> statement-breakpoint
CREATE INDEX "idx_kb_versions_file_id" ON "kb_file_versions" USING btree ("kb_file_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_kb_versions_number" ON "kb_file_versions" USING btree ("kb_file_id","version_number");--> statement-breakpoint
CREATE INDEX "idx_kb_files_filename" ON "kb_files" USING btree ("filename");--> statement-breakpoint
CREATE INDEX "idx_kb_files_locked_synced" ON "kb_files" USING btree ("locked","last_synced_at");--> statement-breakpoint
CREATE INDEX "idx_kb_files_agent" ON "kb_files" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_kb_files_sync_state" ON "kb_files" USING btree ("sync_state");--> statement-breakpoint
CREATE INDEX "idx_non_duplicates_links" ON "non_duplicates" USING btree ("link1","link2");--> statement-breakpoint
CREATE INDEX "idx_non_duplicates_links_reverse" ON "non_duplicates" USING btree ("link2","link1");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_created" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_assistant_files_assistant" ON "openai_assistant_files" USING btree ("assistant_id");--> statement-breakpoint
CREATE INDEX "idx_openai_assistants_slug" ON "openai_assistants" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_openai_assistants_active" ON "openai_assistants" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_projects_user_created" ON "projects" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_reminders_user_scheduled" ON "reminders" USING btree ("user_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "idx_reschedule_jobs_status" ON "reschedule_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_reschedule_jobs_started_at" ON "reschedule_jobs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "idx_searched_at" ON "search_history" USING btree ("searched_at");--> statement-breakpoint
CREATE INDEX "idx_recipient_messages_recipient" ON "sequence_recipient_messages" USING btree ("recipient_id","step_number");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_recipient_messages_unique" ON "sequence_recipient_messages" USING btree ("recipient_id","step_number");--> statement-breakpoint
CREATE INDEX "idx_sequence_recipients_sequence" ON "sequence_recipients" USING btree ("sequence_id");--> statement-breakpoint
CREATE INDEX "idx_sequence_recipients_status" ON "sequence_recipients" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_sequence_recipients_next_send" ON "sequence_recipients" USING btree ("next_send_at");--> statement-breakpoint
CREATE INDEX "idx_sequence_recipients_link" ON "sequence_recipients" USING btree ("link");--> statement-breakpoint
CREATE INDEX "idx_sequence_recipients_email" ON "sequence_recipients" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_scheduled_sends_recipient" ON "sequence_scheduled_sends" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "idx_scheduled_sends_sequence" ON "sequence_scheduled_sends" USING btree ("sequence_id");--> statement-breakpoint
CREATE INDEX "idx_scheduled_sends_scheduled_at" ON "sequence_scheduled_sends" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_scheduled_sends_status" ON "sequence_scheduled_sends" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_scheduled_sends_pending" ON "sequence_scheduled_sends" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_scheduled_sends_eligible_at" ON "sequence_scheduled_sends" USING btree ("eligible_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_scheduled_sends_unique" ON "sequence_scheduled_sends" USING btree ("recipient_id","step_number","repeat_index");--> statement-breakpoint
CREATE INDEX "idx_sequence_steps_sequence" ON "sequence_steps" USING btree ("sequence_id","step_number");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_sequence_steps_unique" ON "sequence_steps" USING btree ("sequence_id","step_number");--> statement-breakpoint
CREATE INDEX "idx_sequences_created_by" ON "sequences" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_sequences_status" ON "sequences" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_sequences_last_sent" ON "sequences" USING btree ("last_sent_at");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "idx_templates_user_created" ON "templates" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_nuke_log_executed_by" ON "test_data_nuke_log" USING btree ("executed_by");--> statement-breakpoint
CREATE INDEX "idx_nuke_log_executed_at" ON "test_data_nuke_log" USING btree ("executed_at");--> statement-breakpoint
CREATE INDEX "idx_test_email_sends_created_by" ON "test_email_sends" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_test_email_sends_thread_id" ON "test_email_sends" USING btree ("gmail_thread_id");--> statement-breakpoint
CREATE INDEX "idx_test_email_sends_status" ON "test_email_sends" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_user_tags_user_id" ON "user_tags" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_proxy_sessions_stream_sid" ON "voice_proxy_sessions" USING btree ("stream_sid");--> statement-breakpoint
CREATE INDEX "idx_proxy_sessions_status" ON "voice_proxy_sessions" USING btree ("status");