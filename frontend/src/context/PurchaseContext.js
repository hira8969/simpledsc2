import { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PurchaseModal } from "@/components/PurchaseModal";
import { useAuth } from "@/context/AuthContext";
import { track } from "@/lib/analytics";

const PurchaseContext = createContext(null);
export const usePurchase = () => useContext(PurchaseContext);

export function PurchaseProvider({ children }) {
  const { requireAuth } = useAuth();
  const [product, setProduct] = useState(null);
  const [open, setOpen] = useState(false);
  const nav = useNavigate();

  const startPurchase = (p) => {
    track("buy_now_click", { product: p?.name });
    requireAuth(() => { setProduct(p); setOpen(true); });
  };

  return (
    <PurchaseContext.Provider value={{ startPurchase }}>
      {children}
      <PurchaseModal open={open} onOpenChange={setOpen} product={product}
        onComplete={() => nav("/dashboard")} />
    </PurchaseContext.Provider>
  );
}
