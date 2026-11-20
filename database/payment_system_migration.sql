-- =====================================================================
-- PHOENIX SOLUTIONS: ADVANCED PAYMENT & FINANCIAL SYSTEM MIGRATION
-- =====================================================================

-- 1. PAYMENT QR CODE SETTINGS
CREATE TABLE IF NOT EXISTS public.payment_qr_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payee_name VARCHAR(255) NOT NULL DEFAULT 'Phoenix Solutions',
    upi_id VARCHAR(255) NOT NULL DEFAULT 'phoenixsolutions@upi',
    payment_description VARCHAR(255) DEFAULT 'Phoenix Solutions Project Payment',
    qr_image_url TEXT,
    qr_type VARCHAR(50) DEFAULT 'static', -- 'static' or 'dynamic'
    is_active BOOLEAN DEFAULT true,
    payment_instructions TEXT DEFAULT '1. Open Google Pay, PhonePe, Paytm or any UPI App.\n2. Scan the QR code or pay using the UPI ID.\n3. Enter the exact payable amount.\n4. Take a screenshot of the confirmed transaction.\n5. Upload the screenshot with your UTR / Transaction ID below.',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default QR settings if none exists
INSERT INTO public.payment_qr_settings (payee_name, upi_id, payment_description, is_active)
SELECT 'Phoenix Solutions', 'phoenixsolutions@upi', 'Phoenix Solutions Project Payment', true
WHERE NOT EXISTS (SELECT 1 FROM public.payment_qr_settings);

-- 2. PROJECT FINANCIAL SCHEDULES & ESTIMATES
-- Adds financial tracking to projects
CREATE TABLE IF NOT EXISTS public.project_financials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID UNIQUE NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    advance_assigned NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    advance_status VARCHAR(50) DEFAULT 'not_assigned', -- 'not_assigned', 'assigned', 'pending', 'partially_paid', 'paid', 'overdue'
    advance_due_date DATE,
    payment_instructions TEXT,
    manager_final_proposal_type VARCHAR(50), -- 'total_cost' or 'additional_amount'
    manager_proposed_amount NUMERIC(12, 2),
    manager_proposal_notes TEXT,
    manager_proposal_status VARCHAR(50) DEFAULT 'none', -- 'none', 'pending_approval', 'approved', 'rejected'
    manager_proposed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    manager_proposed_at TIMESTAMPTZ,
    admin_proposal_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CUSTOMER PAYMENT PROOFS (SCREENSHOT UPLOADS)
CREATE TABLE IF NOT EXISTS public.payment_proofs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    amount_claimed NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'UPI', -- 'UPI', 'Bank Transfer', 'Gateway', 'Other'
    transaction_ref_id VARCHAR(100) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    screenshot_url TEXT NOT NULL,
    customer_notes TEXT,
    verification_status VARCHAR(50) NOT NULL DEFAULT 'pending_verification', -- 'pending_verification', 'approved', 'rejected', 'resubmission_requested'
    rejection_reason TEXT,
    admin_remarks TEXT,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for unique transaction references to prevent duplicate approvals
CREATE INDEX IF NOT EXISTS idx_payment_proofs_tx_ref ON public.payment_proofs(transaction_ref_id);

-- 4. VERIFIED PAYMENT TRANSACTIONS (OFFICIAL AUDITED LEDGER)
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proof_id UUID REFERENCES public.payment_proofs(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    payment_type VARCHAR(50) DEFAULT 'advance', -- 'advance', 'milestone', 'final', 'offline'
    payment_method VARCHAR(50) NOT NULL DEFAULT 'UPI',
    transaction_ref_id VARCHAR(100) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'verified', -- 'verified', 'refunded'
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. INVOICES & RECEIPTS
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    total_amount NUMERIC(12, 2) NOT NULL,
    amount_paid NUMERIC(12, 2) DEFAULT 0.00,
    payable_amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'issued', -- 'issued', 'partially_paid', 'paid', 'cancelled'
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number VARCHAR(100) UNIQUE NOT NULL,
    transaction_id UUID NOT NULL REFERENCES public.payment_transactions(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount_received NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    transaction_ref_id VARCHAR(100) NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SYSTEM NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info', -- 'info', 'payment', 'project', 'alert'
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.payment_qr_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Read policies for public/authenticated users
CREATE POLICY "Public read active QR settings" ON public.payment_qr_settings
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admin manage QR settings" ON public.payment_qr_settings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

CREATE POLICY "Customer read own financials" ON public.project_financials
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.project_users WHERE project_users.project_id = project_financials.project_id AND project_users.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager'))
    );

CREATE POLICY "Customer manage own proofs" ON public.payment_proofs
    FOR ALL USING (
        customer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

CREATE POLICY "Customer read own transactions" ON public.payment_transactions
    FOR SELECT USING (
        customer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager'))
    );

CREATE POLICY "Customer read own notifications" ON public.notifications
    FOR ALL USING (user_id = auth.uid());
