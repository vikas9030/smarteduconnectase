
CREATE TABLE public.fee_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fee_id UUID NOT NULL REFERENCES public.fees(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  receipt_number TEXT NOT NULL,
  razorpay_payment_id TEXT,
  paid_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  recorded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fee_payments" ON public.fee_payments
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Parents can view their children fee_payments" ON public.fee_payments
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM student_parents sp
      JOIN parents p ON sp.parent_id = p.id
      WHERE sp.student_id = fee_payments.student_id AND p.user_id = auth.uid()
    )
  );
