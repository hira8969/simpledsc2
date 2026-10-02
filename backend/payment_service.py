"""Shared payment settlement logic for customer callbacks and webhooks."""
from core import db, new_id, now_iso, gen_invoice_no, notify


async def settle_payment(order: dict, user: dict, payment_id: str,
                         razorpay_order_id: str, signature: str = "") -> dict:
    """Create the payment and invoice records and mark an order as paid."""
    existing = await db.invoices.find_one({"orderId": order["orderId"]}, {"_id": 0})
    if existing:
        return {"ok": True, "invoiceNo": existing["invoiceNo"]}

    invoice_no = await gen_invoice_no()
    await db.payments.insert_one({
        "id": new_id(), "userId": user["id"], "simplDscId": user["simplDscId"],
        "orderId": order["orderId"], "razorpayOrderId": razorpay_order_id,
        "razorpayPaymentId": payment_id, "razorpaySignature": signature,
        "amount": order["totalAmount"], "currency": "INR", "status": "Successful",
        "method": "razorpay", "createdAt": now_iso(), "updatedAt": now_iso(),
    })
    invoice = {
        "id": new_id(), "invoiceNo": invoice_no, "orderId": order["orderId"],
        "userId": user["id"], "simplDscId": user["simplDscId"],
        "amount": order["amount"], "discount": order["discount"], "gst": order["gst"],
        "professionalFee": order["professionalFee"], "totalAmount": order["totalAmount"],
        "productName": order["productName"], "customerName": user.get("name"),
        "billing": user.get("billing", {}), "status": "Paid", "createdAt": now_iso(),
    }
    await db.invoices.insert_one(invoice)
    await db.orders.update_one({"id": order["id"]}, {"$set": {
        "paymentStatus": "Payment Successful", "orderStatus": "Documents Pending",
        "documentStatus": "Pending", "workflowStage": "Payment Successful",
        "invoiceNo": invoice_no, "razorpayPaymentId": payment_id, "updatedAt": now_iso(),
    }})
    await db.order_status_history.insert_one({
        "id": new_id(), "orderId": order["orderId"], "oldStatus": "Payment Pending",
        "newStatus": "Payment Successful", "changedBy": "system",
        "timestamp": now_iso(), "notes": "Payment verified",
    })
    if order.get("couponCode"):
        await db.coupons.update_one({"code": order["couponCode"]}, {"$inc": {"usedCount": 1}})
    await notify(
        "customer", user["id"], "payment_success", "Payment Successful",
        f"Payment received for order {order['orderId']}. Please upload your documents.",
        "order", order["orderId"],
    )
    return {"ok": True, "invoiceNo": invoice_no}
