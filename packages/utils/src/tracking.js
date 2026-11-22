"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTrackingNumber = generateTrackingNumber;
exports.isValidTrackingNumber = isValidTrackingNumber;
exports.formatTrackingNumber = formatTrackingNumber;
const TRACKING_PREFIX = 'CRD';
const TRACKING_LENGTH = 10;
function generateTrackingNumber() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const raw = `${timestamp}${random}`;
    const padded = raw.slice(-TRACKING_LENGTH).padStart(TRACKING_LENGTH, '0');
    return `${TRACKING_PREFIX}-${padded}`;
}
function isValidTrackingNumber(value) {
    return /^CRD-[A-Z0-9]{10}$/.test(value);
}
function formatTrackingNumber(value) {
    const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.startsWith('CRD') && clean.length === 13) {
        return `CRD-${clean.slice(3)}`;
    }
    return value;
}
