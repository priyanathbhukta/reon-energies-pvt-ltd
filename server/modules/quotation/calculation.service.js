/**
 * calculation.service.js
 * Pure, reusable solar sizing calculation logic.
 * No DB access — safe to call from frontend preview or backend.
 */

const ELECTRICITY_RATES = {
  domestic: 8,
  commercial: 12.5,
};

/**
 * Calculate all solar system parameters.
 * @param {object} params
 * @param {number} params.monthly_bill       - Monthly electricity bill in ₹
 * @param {number} params.installation_area  - Available rooftop area in sqft
 * @param {number} params.panel_size         - Single panel area in sqft
 * @param {number} params.panel_power        - Single panel power in Watts
 * @param {string} [params.installation_type]  - 'domestic' | 'commercial'
 * @param {number} [params.electricity_rate]   - Override rate ₹/unit; if null uses type default
 * @param {number} [params.cost_per_kw]        - ₹ per kW installed (user-provided)
 * @param {string} [params.payment_mode]       - 'Cash' | 'EMI'
 * @param {number} [params.emi_months]         - Loan tenure in months (default 60)
 * @param {number} [params.emi_interest_rate]  - Annual interest % (default 8.5)
 * @returns {object} Calculation results
 */
export function calculateSolar({
  monthly_bill,
  installation_area,
  panel_size,
  panel_power,
  installation_type = 'domestic',
  electricity_rate = null,
  cost_per_kw = null,
  payment_mode = 'Cash',
  emi_months = 60,
  emi_interest_rate = 8.5,
}) {
  const rate =
    electricity_rate != null
      ? Number(electricity_rate)
      : ELECTRICITY_RATES[installation_type] ?? 8;

  const mb = Number(monthly_bill);
  const ia = Number(installation_area);
  const ps = Number(panel_size);
  const pp = Number(panel_power);

  // Core formulas
  const raw_system_size = mb / (30 * rate);                         // kW
  const raw_panels = (raw_system_size * 1000) / pp;                 // count
  const effective_panel_area = ps * 1.1;                            // sqft (10% gap allowance)
  const max_panels_possible = ia / effective_panel_area;
  const final_panels = Math.floor(Math.min(raw_panels, max_panels_possible));
  const final_system_size = (final_panels * pp) / 1000;             // kW
  const monthly_units = final_system_size * 4 * 30;                 // units/month (4 peak hrs/day)
  const monthly_savings = monthly_units * rate;                     // ₹/month
  const area_required = final_panels * effective_panel_area;        // sqft

  // Cost & EMI
  const total_cost = cost_per_kw ? final_system_size * Number(cost_per_kw) : null;

  let emi_details = null;
  if (payment_mode === 'EMI' && total_cost) {
    const principal = total_cost;
    const monthly_rate = emi_interest_rate / 100 / 12;
    const emi_amount =
      monthly_rate === 0
        ? principal / emi_months
        : (principal * monthly_rate * Math.pow(1 + monthly_rate, emi_months)) /
          (Math.pow(1 + monthly_rate, emi_months) - 1);

    emi_details = {
      principal: parseFloat(principal.toFixed(2)),
      monthly_emi: Math.round(emi_amount),
      months: emi_months,
      interest_rate: emi_interest_rate,
      total_payable: Math.round(emi_amount * emi_months),
      total_interest: Math.round(emi_amount * emi_months - principal),
    };
  }

  return {
    electricity_rate: rate,
    system_size: parseFloat(final_system_size.toFixed(3)),
    panels: final_panels,
    area_required: parseFloat(area_required.toFixed(2)),
    monthly_generation: parseFloat(monthly_units.toFixed(2)),
    monthly_savings: parseFloat(monthly_savings.toFixed(2)),
    annual_savings: parseFloat((monthly_savings * 12).toFixed(2)),
    total_cost: total_cost ? parseFloat(total_cost.toFixed(2)) : null,
    emi_details,
  };
}

export { ELECTRICITY_RATES };
