const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const path = require('path');
const twilio = require('twilio');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve the frontend (ggg.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'ggg.html'));
});

// Route to test SMTP connection
app.post('/test-smtp', async (req, res) => {
    const { smtpHost, username, password } = req.body;

    if (!smtpHost || !username || !password) {
        return res.status(400).json({ error: 'Missing required fields for SMTP settings.' });
    }

    try {
        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: 587,
            secure: false, // true for port 465, false for other ports
            auth: {
                user: username,
                pass: password,
            },
        });

        await transporter.verify();
        res.json({ success: 'SMTP settings are correct!' });
    } catch (error) {
        res.status(500).json({ error: `SMTP test failed: ${error.message}` });
    }
});

// Route to send email
app.post('/send', async (req, res) => {
    const { smtpHost, username, password, from, subject, recipients, message } = req.body;

    if (!smtpHost || !username || !password || !from || !recipients || !subject || !message) {
        return res.status(400).json({ error: 'Missing required fields for sending email.' });
    }

    try {
        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: 587,
            secure: false,
            auth: {
                user: username,
                pass: password,
            },
        });

        const recipientList = recipients.split(',').map(email => email.trim());

        const mailOptions = {
            from: from,
            bcc: recipientList,
            subject: subject,
            text: message,
        };

        const info = await transporter.sendMail(mailOptions);
        res.json({
            message: 'Emails sent successfully.',
            info,
            recipients: recipientList,
        });
    } catch (error) {
        res.status(500).json({ error: `Failed to send email: ${error.message}` });
    }
});

// Route to test Twilio connection
app.post('/test-twilio', (req, res) => {
    const { accountSid, authToken } = req.body;

    if (!accountSid || !authToken) {
        return res.status(400).json({ error: 'Missing required fields for Twilio settings.' });
    }

    try {
        const client = twilio(accountSid, authToken);
        client.api.accounts(accountSid)
            .fetch()
            .then(() => res.json({ success: 'Twilio credentials are valid.' }))
            .catch((error) => res.status(400).json({ error: error.message }));
    } catch (error) {
        res.status(500).json({ error: `Twilio test failed: ${error.message}` });
    }
});

// Route to send SMS
app.post('/send-sms', async (req, res) => {
    const { accountSid, authToken, from, to, message } = req.body;

    if (!accountSid || !authToken || !from || !to || !message) {
        return res.status(400).json({ error: 'Missing required fields for sending SMS.' });
    }

    try {
        const client = twilio(accountSid, authToken);
        const recipientList = to.split(',').map(number => number.trim());

        const results = { success: [], failed: [] };

        for (const recipient of recipientList) {
            try {
                const msg = await client.messages.create({
                    from,
                    to: recipient,
                    body: message,
                });
                results.success.push({ to: recipient, sid: msg.sid });
            } catch (error) {
                results.failed.push({ to: recipient, error: error.message });
            }
        }

        res.json({ message: 'SMS sending process completed.', results });
    } catch (error) {
        res.status(500).json({ error: `Failed to send SMS: ${error.message}` });
    }
});

// Serve HTML pages for email and SMS interfaces
app.get('/email', (req, res) => {
    res.sendFile(path.join(__dirname, 'ggg.html'));
});

app.get('/sms', (req, res) => {
    res.sendFile(path.join(__dirname, 'gig.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
