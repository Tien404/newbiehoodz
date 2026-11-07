export const studyFilters = ["all", "quiet", "open late", "budget"] as const;

const schoolsByDistrict = [
  [
    "Quận 10",
    [
      ["BK", "Bách Khoa (HCMUT)"],
      ["UEH ISB", "UEH International School of Business"],
      ["Hoa Sen", "Hoa Sen University"],
      ["PNT", "Phạm Ngọc Thạch University of Medicine"],
      ["HUFLIT", "HUFLIT"],
    ],
  ],
  [
    "Quận 1",
    [
      ["Nhân Văn", "Nhân Văn (USSH)"],
      ["Hoa Sen", "Hoa Sen University"],
      ["SGU", "Saigon University"],
      ["ĐH Ngân hàng", "University of Banking (HUB)"],
      ["OU", "HCMC Open University"],
      ["ULAW", "HCMC University of Law"],
    ],
  ],
  [
    "Quận 7",
    [
      ["RMIT", "RMIT University"],
      ["Tôn Đức Thắng", "Tôn Đức Thắng University"],
      ["UFM", "University of Finance – Marketing"],
    ],
  ],
  [
    "Quận Tân Phú",
    [
      ["Greenwich", "Greenwich Vietnam"],
      ["HUIT", "HUIT"],
      ["OU", "HCMC Open University"],
    ],
  ],
  [
    "Quận 5",
    [
      ["ĐH SG", "Saigon University"],
      ["KHTN", "University of Science (HCMUS)"],
    ],
  ],
  [
    "Quận Tân Bình",
    [
      ["VAA", "Vietnam Aviation Academy"],
      ["Swinburne", "Swinburne Vietnam"],
    ],
  ],
] as const;

export const schoolDistrictGroups = schoolsByDistrict.map(
  ([district, schools]) => ({
    label: district,
    options: schools.map(([id, label]) => ({
      value: `school:${district}:${id}`,
      label,
    })),
  }),
);

export function resolveStudyDistrict(value: string) {
  return (
    schoolDistrictGroups.find((group) =>
      group.options.some((option) => option.value === value),
    )?.label ?? value
  );
}
