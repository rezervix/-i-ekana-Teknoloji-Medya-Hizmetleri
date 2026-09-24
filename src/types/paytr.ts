export interface PaytrIframeBasketItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface PaytrCardStorage {
  save_card: 0 | 1;
  uys_consent?: 0 | 1;
  uys_consent_text?: string;
  uys_contract_text?: string;
  uys_info_text?: string;
}

export interface PaytrIframeTokenParams {
  merchant_oid: string;
  email: string;
  payment_amount_tl: number;
  user_name: string;
  user_phone: string;
  user_address: string;
  user_ip: string;
  user_basket: PaytrIframeBasketItem[];
  no_installment?: 0 | 1;
  max_installment?: number;
  currency?: string;
  test_mode?: 0 | 1;
  success_url?: string;
  fail_url?: string;
  callback_url?: string;
  card_storage?: PaytrCardStorage;
}

export interface PaytrIframeTokenResponse {
  status: 'success' | 'error';
  token?: string;
  reason?: string;
}

export interface PaytrCallbackPayload {
  merchant_id: string;
  merchant_oid: string;
  status: '1' | '0' | 1 | 0;
  total_amount: string;
  hash: string;
  err_code?: string;
  err_msg?: string;
  payment_type?: string;
  currency?: string;
  payment_amount?: string;
  utoken?: string;
  ctoken?: string;
  masked_cc?: string;
  cc_bin?: string;
  cc_brand?: string;
  cc_type?: string;
  installment_count?: string;
  md_status?: string;
  test_mode?: string;
}

export interface PaytrNon3dChargeParams {
  merchant_oid: string;
  email: string;
  payment_amount_tl: number;
  utoken: string;
  ctoken?: string;
  user_ip?: string;
  currency?: string;
  test_mode?: 0 | 1;
}

export interface PaytrNon3dChargeResponse {
  status: 'success' | 'error';
  err_code?: string;
  err_msg?: string;
  payment_id?: string;
  is_success?: boolean;
  hash?: string;
}
