'use strict';

// ─── YOUR FILE, implement this ───────────────────────────────────────────────
// Create a BullMQ Worker that processes jobs from the 'email' queue.
//
// Requirements:
//  1. Handle job.name === 'otp': send an email with the OTP using transporter.
//  2. Configure retries: attempts: 3, backoff: { type: 'exponential', delay: 1000 }
//  3. Log worker.on('completed') and worker.on('failed') events.
//  4. Throwing inside the worker function → job fails → BullMQ retries.
//     Returning without throwing → job completed.

const { Worker } = require('bullmq');
const { connection } = require('./queue');
const { transporter } = require('./email');

const worker = new Worker('email', async (job) => {
  if (job.name !== 'otp') {
    throw new Error(`Unsupported email job: ${job.name}`);
  }

  const { to, otp } = job.data;
  await transporter.sendMail({
    from: process.env.SMTP_USER || 'no-reply@example.com',
    to,
    subject: 'Email verification OTP',
    text: `Your verification code is ${otp}.`,
  });
}, { connection });

worker.on('completed', (job) => {
  console.log(`Email job ${job.id} completed`);
});

worker.on('failed', (job, error) => {
  console.error(`Email job ${job && job.id} failed:`, error);
});
