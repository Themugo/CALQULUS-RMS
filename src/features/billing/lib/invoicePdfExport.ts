import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/shared/lib/dateFormat";

import { CurrencyCode } from "@/shared/hooks/useCurrency";

interface JsPDFWithAutoTable extends jsPDF {
  lastAutoTable?: { finalY: number };
}

interface InvoiceData {
  invoice_number: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: string;
  description: string | null;
  created_at: string;
  tenant?: {
    name: string;
    email: string;
    phone?: string | null;
  } | null;
  lease?: {
    property: string;
    unit: string;
  } | null;
}

interface CompanySettings {
  company_name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  logo_url: string | null;
}

const createCurrencyFormatter = (currency: CurrencyCode = "KES") => {
  const locale = currency === "KES" ? "en-KE" : currency === "USD" ? "en-US" : currency === "EUR" ? "de-DE" : "en-GB";
  return (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };
};

const fetchCompanySettings = async (): Promise<CompanySettings | null> => {
  const { data, error } = await supabase
    .from("company_settings")
    .select("*")
    .maybeSingle();

  if (!error && data) {
    return data;
  }
  return null;
};

export const generateInvoicePDF = async (invoice: InvoiceData, currency: CurrencyCode = "KES"): Promise<jsPDF> => {
  const doc = new jsPDF();
  const formatCurrency = createCurrencyFormatter(currency);
  const pageWidth = doc.internal.pageSize.getWidth();
  const companySettings = await fetchCompanySettings();

  let yPos = 14;
  let logoWidth = 0;

  // Company Header with Logo
  if (companySettings) {
    // Add logo if available
    if (companySettings.logo_url) {
      try {
        const response = await fetch(companySettings.logo_url);
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        
        const img = new Image();
        img.src = base64;
        await new Promise((resolve) => { img.onload = resolve; });
        const aspectRatio = img.width / img.height;
        const logoHeight = 20;
        logoWidth = logoHeight * aspectRatio;
        
        doc.addImage(base64, "PNG", 14, yPos - 4, logoWidth, logoHeight);
      } catch {
        // Logo failed to load — continue without it
      }
    }

    const textStartX = logoWidth > 0 ? 14 + logoWidth + 6 : 14;
    
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(companySettings.company_name, textStartX, yPos);
    yPos += 6;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);

    if (companySettings.address) {
      doc.text(companySettings.address, textStartX, yPos);
      yPos += 4;
    }

    if (companySettings.city || companySettings.state || companySettings.zip_code) {
      const cityStateZip = [
        companySettings.city,
        companySettings.state,
        companySettings.zip_code,
      ]
        .filter(Boolean)
        .join(", ");
      doc.text(cityStateZip, textStartX, yPos);
      yPos += 4;
    }

    const contactInfo: string[] = [];
    if (companySettings.phone) contactInfo.push(`Tel: ${companySettings.phone}`);
    if (companySettings.email) contactInfo.push(companySettings.email);
    if (contactInfo.length > 0) {
      doc.text(contactInfo.join(" | "), textStartX, yPos);
      yPos += 4;
    }

    if (companySettings.website) {
      doc.text(companySettings.website, textStartX, yPos);
      yPos += 4;
    }

    doc.setTextColor(0, 0, 0);
    
    if (logoWidth > 0) {
      yPos = Math.max(yPos, 14 + 20 + 6);
    }
    yPos += 6;
  }

  // Invoice Title
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  // Invoice Number and Date
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Invoice #: ${invoice.invoice_number}`, 14, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${formatDate(invoice.created_at)}`, pageWidth - 14, yPos, { align: "right" });
  yPos += 10;

  // Separator line
  doc.setDrawColor(200, 200, 200);
  doc.line(14, yPos, pageWidth - 14, yPos);
  yPos += 10;

  // Bill To section
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Bill To:", 14, yPos);
  yPos += 6;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  if (invoice.tenant) {
    doc.text(invoice.tenant.name, 14, yPos);
    yPos += 5;
    doc.text(invoice.tenant.email, 14, yPos);
    yPos += 5;
    if (invoice.tenant.phone) {
      doc.text(invoice.tenant.phone, 14, yPos);
      yPos += 5;
    }
  }
  
  if (invoice.lease) {
    doc.text(`${invoice.lease.property} - ${invoice.lease.unit}`, 14, yPos);
    yPos += 5;
  }
  yPos += 8;

  // Invoice Details Table
  autoTable(doc, {
    startY: yPos,
    head: [["Description", "Due Date", "Status", "Amount"]],
    body: [
      [
        invoice.description || "Monthly Rent",
        formatDate(invoice.due_date),
        invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1),
        formatCurrency(invoice.amount),
      ],
    ],
    theme: "striped",
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    styles: {
      fontSize: 10,
      cellPadding: 5,
    },
    columnStyles: {
      0: { cellWidth: 80 },
      3: { halign: "right", fontStyle: "bold" },
    },
  });

  const docWithTable = doc as JsPDFWithAutoTable;
  const finalY = (docWithTable.lastAutoTable?.finalY ?? 100) + 10;

  // Total Box
  doc.setFillColor(245, 245, 245);
  doc.rect(pageWidth - 80, finalY, 66, 20, "F");
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Total Due:", pageWidth - 76, finalY + 8);
  doc.setFontSize(14);
  doc.text(formatCurrency(invoice.amount), pageWidth - 18, finalY + 15, { align: "right" });

  // Payment Status
  const statusY = finalY + 30;
  if (invoice.status === "paid") {
    doc.setTextColor(34, 197, 94);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("PAID", pageWidth / 2, statusY, { align: "center" });
    if (invoice.paid_date) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Paid on: ${formatDate(invoice.paid_date)}`, pageWidth / 2, statusY + 6, { align: "center" });
    }
  } else if (invoice.status === "overdue") {
    doc.setTextColor(239, 68, 68);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("OVERDUE", pageWidth / 2, statusY, { align: "center" });
  }
  doc.setTextColor(0, 0, 0);

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  if (companySettings) {
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    const footerText = [
      companySettings.company_name,
      companySettings.phone,
      companySettings.email,
    ]
      .filter(Boolean)
      .join(" | ");
    doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: "center" });
    doc.setTextColor(0, 0, 0);
  }

  return doc;
};

export const downloadInvoicePDF = async (invoice: InvoiceData, currency: CurrencyCode = "KES") => {
  const doc = await generateInvoicePDF(invoice, currency);
  doc.save(`invoice_${invoice.invoice_number}_${new Date().toISOString().split("T")[0]}.pdf`);
};
