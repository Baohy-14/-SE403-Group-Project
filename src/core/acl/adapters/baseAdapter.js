/**
 * Base Abstract HIS Integration Adapter
 * Defines the contract that every HIS adapter must adhere to
 */

class BaseHisAdapter {
  constructor(facilityId, hisName) {
    if (this.constructor === BaseHisAdapter) {
      throw new Error("Cannot instantiate abstract class BaseHisAdapter");
    }
    this.facilityId = facilityId;
    this.hisName = hisName;
  }

  /**
   * Synchronize appointment to HIS
   * @param {Object} fhirAppointment - Standard HL7 FHIR Appointment Resource
   * @returns {Promise<{ success: boolean, hisReferenceCode: string, details: any }>}
   */
  async syncAppointment(fhirAppointment) {
    throw new Error("Method syncAppointment() must be implemented by subclass");
  }

  /**
   * Cancel appointment in HIS
   * @param {string} appointmentId
   * @returns {Promise<{ success: boolean }>}
   */
  async cancelAppointment(appointmentId) {
    throw new Error("Method cancelAppointment() must be implemented by subclass");
  }

  /**
   * Check connection health
   */
  async checkHealth() {
    throw new Error("Method checkHealth() must be implemented by subclass");
  }
}

module.exports = BaseHisAdapter;
