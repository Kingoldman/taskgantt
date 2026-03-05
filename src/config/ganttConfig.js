export const TIME_SCALES = [
  { value: "day", label: "日", daysPerCell: 1, cellWidth: 50 },
  { value: "week", label: "周", daysPerCell: 7, cellWidth: 100 },
  { value: "month", label: "月", daysPerCell: 30, cellWidth: 120 },
  { value: "quarter", label: "季度", daysPerCell: 90, cellWidth: 150 },
  { value: "year", label: "年", daysPerCell: 365, cellWidth: 200 },
];

export const ZOOM_CONFIG = {
  min: 20,
  max: 500,
  step: 1,
};
