/* ============================================================
   Cloudflare Pages Function — /api/apply
   ============================================================
   Receives the career form submission (including the CV file)
   from script.js, and emails it via Resend — with the CV as a
   real attachment (not just a link).

   IMPORTANT: this file must live at functions/api/apply.js in
   your deployed folder (a "functions" folder next to index.html).
   Cloudflare Pages automatically turns it into an API endpoint
   at yoursite.pages.dev/api/apply — no extra setup needed beyond
   that folder structure + the RESEND_API_KEY environment variable
   (see the deployment guide).
============================================================ */

// Converts a file's bytes into base64 safely, without hitting
// call-stack limits on larger files (5MB CVs included).
function arrayBufferToBase64(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;

    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }

    return btoa(binary);
}

export async function onRequestPost(context) {

    try {
        const formData = await context.request.formData();

        const name = formData.get("name") || "";
        const email = formData.get("email") || "";
        const phone = formData.get("phone") || "";
        const position = formData.get("position") || "";
        const message = formData.get("message") || "No additional message provided.";
        const cvFile = formData.get("attachment");

        const attachments = [];

        if (cvFile && typeof cvFile.arrayBuffer === "function") {
            const buffer = await cvFile.arrayBuffer();
            attachments.push({
                filename: cvFile.name,
                content: arrayBufferToBase64(buffer)
            });
        }

        // ===== EDIT THIS: where applications should be received =====
        const RECEIVING_EMAIL = "info.ovationtravel@gmail.com";

        const emailPayload = {
            from: "Ovation Travels Careers <onboarding@resend.dev>",
            to: [RECEIVING_EMAIL],
            reply_to: email,
            subject: "New Career Application — " + position,
            html:
                "<p><strong>Full Name:</strong> " + name + "</p>" +
                "<p><strong>Email:</strong> " + email + "</p>" +
                "<p><strong>Phone:</strong> " + phone + "</p>" +
                "<p><strong>Position Applied For:</strong> " + position + "</p>" +
                "<p><strong>Message:</strong><br>" + message + "</p>",
            attachments: attachments
        };

        const resendResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + context.env.RESEND_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(emailPayload)
        });

        const result = await resendResponse.json();

        if (resendResponse.ok) {
            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        } else {
            return new Response(JSON.stringify({ success: false, error: result }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }

    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
