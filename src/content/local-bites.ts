export const firstDishes = [
  { id: "pho", name: "Pho", description: "noodle soup" },
  { id: "banh-mi", name: "Banh mi", description: "crispy baguette" },
  { id: "com-tam", name: "Com tam", description: "broken rice" },
  { id: "banh-xeo", name: "Banh xeo", description: "crispy pancake" },
] as const;

export const orderingPhrases = [
  { id: "spicy", vietnamese: "Không cay", english: "not spicy" },
  {
    id: "portion",
    vietnamese: "Cho mình một phần",
    english: "one portion, please",
  },
  { id: "bill", vietnamese: "Tính tiền", english: "the bill, please" },
] as const;
