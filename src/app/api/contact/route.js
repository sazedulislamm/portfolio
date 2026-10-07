import { NextResponse } from 'next/server';
import { createAdminMessage } from '@/lib/cloudflare-d1';

async function sendEmail(to, subject, message, senderEmail, senderName) {
  const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY;

  if (!accessKey) {
    throw new Error('Web3Forms access key is not configured');
  }

  const response = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_key: accessKey,
      subject,
      from_name: senderName,
      email: senderEmail,
      to: to,
      message,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    throw new Error(result.message || 'Failed to send email notification');
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    // Validate required fields
    const { firstName, lastName, email, phone, service, message } = body;

    if (!email || !message) {
      return NextResponse.json(
        { error: 'Email and message are required' },
        { status: 400 }
      );
    }

    const name = `${firstName || ''} ${lastName || ''}`.trim() || 'Anonymous';
    const subject = `New contact from ${name}${service ? ` (${service})` : ''}`;

    // Save to database
    await createAdminMessage({
      name,
      email,
      subject,
      message,
      service,
      phone,
    });

    // Send email notification
    const emailContent = [
      `Name: ${name}`,
      `Email: ${email}`,
      phone ? `Phone: ${phone}` : null,
      service ? `Service: ${service}` : null,
      '',
      `Message:\n${message}`,
    ]
      .filter(Boolean)
      .join('\n');

    await sendEmail(
      process.env.ADMIN_EMAIL || 'sazedulislam9126@gmail.com',
      subject,
      emailContent,
      email,
      name
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Your message has been received and saved. Thank you!',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Contact API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to process contact form',
      },
      { status: 500 }
    );
  }
}
