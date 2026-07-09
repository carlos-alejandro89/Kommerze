import { ArrowRightLeft, CheckCircle, CreditCard, DollarSign, MoreHorizontal } from 'lucide-react';

export const CARD_PAYMENT_CLAVES = new Set(['04', '28', '29']);
export const pinpadConfigurada = true;

export const isCardPayment = (paymentInfo) => {
    const clave = String(paymentInfo?.Clave ?? '').trim();
    const nombre = String(paymentInfo?.Nombre ?? '').toLowerCase();
    return CARD_PAYMENT_CLAVES.has(clave) || nombre.includes('tarjeta') || paymentInfo?.ID === 2;
};

// Claves SAT comunes en un POS:
// 01=Efectivo, 02=Cheque, 03=Transferencia, 04/28/29=Tarjetas
const COMMON_METHOD_CLAVES = new Set(['01', '02', '03', '04', '28', '29']);

export const isCommonMethod = (fp) =>
    COMMON_METHOD_CLAVES.has(String(fp.Clave).trim());

const METHOD_ICONS_BY_CLAVE = {
    '01': DollarSign,
    '02': CheckCircle,
    '03': ArrowRightLeft,
    '04': CreditCard,
    '05': CreditCard,
    '06': ArrowRightLeft,
    '28': CreditCard,
    '29': CreditCard,
};

const METHOD_COLORS_BY_CLAVE = {
    '01': 'from-emerald-500 to-emerald-700',
    '02': 'from-amber-500  to-amber-700',
    '03': 'from-violet-500 to-violet-700',
    '04': 'from-blue-500   to-blue-700',
    '05': 'from-purple-500 to-purple-700',
    '06': 'from-cyan-500   to-cyan-700',
    '28': 'from-sky-500    to-sky-700',
    '29': 'from-indigo-500 to-indigo-700',
};

export const getMethodIcon = (fp) =>
    METHOD_ICONS_BY_CLAVE[String(fp.Clave).trim()] ?? MoreHorizontal;

export const getMethodColor = (fp) =>
    METHOD_COLORS_BY_CLAVE[String(fp.Clave).trim()] ?? 'from-slate-500 to-slate-700';
