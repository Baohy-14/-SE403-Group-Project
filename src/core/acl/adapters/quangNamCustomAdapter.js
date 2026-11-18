/**
 * Concrete Adapter 3: HIS Quảng Nam (Legacy Custom RPC / Numeric Patient Key)
 * Translates HL7 FHIR R4 { Patient, Appointment } -> Custom RPC format using integer `ma_bn_noi_bo`.
 */

const BaseHisAdapter = require('./baseAdapter');

class QuangNamCustomAdapter extends BaseHisAdapter {
  async syncAppointment(canonicalBundle, timeoutMs = 1500) {
    const { patient, appointment } = canonicalBundle;
    const localNumericId =
      patient.identifier.find((i) => i.system.includes(this.facilityId))?.value || '99000';
    const doctorCode =
      appointment.participant
        .find((p) => p.actor.reference.startsWith('Practitioner/'))
        ?.actor.reference.replace('Practitioner/', '') || 'DOC';
    const idemKey = appointment.identifier?.[0]?.value || appointment.id;

    const rpcPayload = {
      rpc_method: 'sp_ghi_nhan_lich_hen_online',
      params: {
        ma_giao_dich_ngoai: idemKey,
        ma_bn_noi_bo: parseInt(localNumericId, 10) || 99000,
        ten_bn: patient.name?.[0]?.text || 'Benh nhan',
        ma_bac_si: doctorCode,
        khung_gio_iso: appointment.start
      }
    };

    const res = await fetch(`${this.baseUrl}/his-rpc/v1/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idemKey
      },
      body: JSON.stringify(rpcPayload),
      signal: AbortSignal.timeout(timeoutMs)
    });

    if (!res.ok) {
      throw new Error(`HIS_QUANGNAM_RPC_HTTP_${res.status}`);
    }

    const data = await res.json();
    return {
      success: true,
      hisReferenceCode: data.so_phieu_kham || `QN-${Date.now()}`,
      protocol: 'CUSTOM_RPC_JSON'
    };
  }
}

module.exports = QuangNamCustomAdapter;
