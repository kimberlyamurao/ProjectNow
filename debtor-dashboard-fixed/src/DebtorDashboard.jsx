import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

export default function DebtorDashboard() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDebtors();

    const channel = supabase
      .channel("debtors-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "debtors",
        },
        () => {
          fetchDebtors();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchDebtors() {
    const { data, error } = await supabase
      .from("debtors")
      .select("*")
      .order("balance", { ascending: false });

    if (!error) {
      setCustomers(data);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial"
      }}>
        Loading dashboard...
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f1f5f9",
      padding: "30px",
      fontFamily: "Arial"
    }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{
          fontSize: "40px",
          fontWeight: "900",
          marginBottom: "10px"
        }}>
          Debtor Recovery Dashboard
        </h1>

        <p style={{
          color: "#64748b",
          marginBottom: "30px"
        }}>
          Live Supabase Realtime Dashboard
        </p>

        <div style={{
          display: "grid",
          gap: "16px"
        }}>
          {customers.map((customer) => (
            <div
              key={customer.id}
              style={{
                background: "white",
                borderRadius: "20px",
                padding: "20px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)"
              }}
            >
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <div>
                  <h2 style={{
                    fontWeight: "700",
                    fontSize: "20px"
                  }}>
                    {customer.name}
                  </h2>

                  <div style={{
                    display: "flex",
                    gap: "10px",
                    marginTop: "8px",
                    color: "#64748b"
                  }}>
                    <span>Owner: {customer.owner}</span>
                    <span>Days: {customer.oldest_inv_days}</span>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{
                    fontSize: "28px",
                    fontWeight: "900",
                    color: "#2563eb"
                  }}>
                    €{Number(customer.balance).toLocaleString()}
                  </div>

                  <div style={{
                    marginTop: "6px",
                    color: "#64748b",
                    fontSize: "12px"
                  }}>
                    {customer.action}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}