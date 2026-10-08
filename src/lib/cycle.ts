export interface CycleRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

export function getSalaryCycle(targetDate: Date, salaryDay: number, offsetMonth: number = 0): CycleRange {
  const d = new Date(targetDate);
  d.setMonth(d.getMonth() + offsetMonth);

  const year = d.getFullYear();
  const month = d.getMonth();
  const currentDay = d.getDate();

  let startYear = year;
  let startMonth = month;

  // Jika tanggal hari ini sebelum tanggal gajian, siklus dimulai dari bulan kemarin
  if (currentDay < salaryDay) {
    startMonth = month - 1;
    if (startMonth < 0) {
      startMonth = 11;
      startYear = year - 1;
    }
  }

  // Hitung tanggal akhir siklus (1 hari sebelum tanggal gajian berikutnya)
  let endYear = startYear;
  let endMonth = startMonth + 1;
  if (endMonth > 11) {
    endMonth = 0;
    endYear = startYear + 1;
  }

  const startDate = new Date(startYear, startMonth, salaryDay, 0, 0, 0, 0);
  const endDate = new Date(endYear, endMonth, salaryDay - 1, 23, 59, 59, 999);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const label = `${salaryDay} ${monthNames[startMonth]} - ${salaryDay - 1} ${monthNames[endMonth]} ${endYear}`;

  return { startDate, endDate, label };
}