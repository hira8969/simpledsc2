const CONTENT = {
  terms: {
    title: "Terms & Conditions",
    body: [
      ["Acceptance", "By using SimplDSC, you agree to these terms. SimplDSC operates as a registration assistance platform for CCA-licensed Certifying Authorities."],
      ["Services", "We facilitate application, verification and issuance of Digital Signature Certificates. Final issuance is performed by the relevant Certifying Authority."],
      ["Customer Responsibilities", "You must provide accurate information and valid documents. Providing false information may result in rejection without refund."],
      ["Payments", "All payments are processed securely via Razorpay. Prices are inclusive of applicable taxes unless stated otherwise."],
      ["Limitation of Liability", "SimplDSC is not liable for delays or rejections caused by incorrect documents or Certifying Authority processes."],
    ],
  },
  privacy: {
    title: "Privacy Policy",
    body: [
      ["Information We Collect", "We collect your name, mobile, email and KYC documents solely to process your DSC application."],
      ["How We Use It", "Your information is used only for identity verification, DSC issuance and support. We never sell your data."],
      ["Document Security", "Documents are stored privately and accessed only by authorized staff for verification purposes."],
      ["Data Sharing", "We share required details with the relevant Certifying Authority to issue your certificate."],
      ["Your Rights", "You may request access to or deletion of your personal data by contacting support@simpldsc.in."],
    ],
  },
  refund: {
    title: "Refund Policy",
    body: [
      ["Eligibility", "Refunds may be requested before the DSC application is submitted to the Certifying Authority."],
      ["Non-Refundable", "Once a certificate is issued, the professional and government fees are non-refundable."],
      ["Process", "Approved refunds are processed to the original payment method via Razorpay within 5–7 business days."],
      ["Cancellation", "You may request cancellation from your dashboard; our team will review and respond."],
    ],
  },
};

export default function Legal({ type }) {
  const c = CONTENT[type];
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <h1 className="font-display text-4xl font-extrabold text-navy-900">{c.title}</h1>
      <p className="mt-2 text-sm text-slate-400">Last updated {new Date().getFullYear()} · Policy version 1.0</p>
      <div className="mt-8 space-y-7">
        {c.body.map(([h, p]) => (
          <div key={h}>
            <h2 className="font-display text-lg font-bold text-navy-900">{h}</h2>
            <p className="mt-1.5 text-slate-600 leading-relaxed">{p}</p>
          </div>
        ))}
      </div>
      <p className="mt-10 rounded-xl bg-lavender-50 p-4 text-xs text-slate-500">This is a summary policy. Final legal wording should be reviewed before production use.</p>
    </div>
  );
}
