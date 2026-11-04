/** Exact reference copy; informational cards are not new outbound links. */
export type GuideTip = { heading: string; body: string; color: string };
export const streetTips: GuideTip[] = [
  {
    heading: "Ride your way",
    body: "Book bikes or cars through Grab or Be, explore by bus, or take Metro Line 1 towards the east of the city. Check the fare in the app before confirming your ride.",
    color: "mint",
  },
  {
    heading: "Learn the price shorthand",
    body: "“35k” means 35,000 VND. Ask “How much is it?” if you are unsure of the price.",
    color: "pink",
  },
  {
    heading: "Keep some small cash",
    body: "Handy for street food, small shops, and parking. Check your notes carefully before paying.",
    color: "yellow",
  },
  {
    heading: "Look for the “hẻm”",
    body: "It means alley! Your café or accommodation may be tucked behind the main street.",
    color: "blue",
  },
  {
    heading: "Keep your parking ticket",
    body: "Ask “How much for parking?” before parking and keep the ticket until you collect your bike.",
    color: "lavender",
  },
  {
    heading: "Check before bargaining",
    body: "Ask the price first at market stalls; follow the displayed prices at cafés, restaurants, and stores.",
    color: "peach",
  },
];
export const apps = [
  {
    badge: "G",
    heading: "Grab & Be",
    body: "Book motorbike or car rides. Compare the final fares and available vouchers before choosing.",
    color: "mint",
    image: "rider",
  },
  {
    badge: "S",
    heading: "ShopeeFood",
    body: "Order food to your door. Check vouchers, minimum spending, and delivery fees - the biggest discount does not always mean the lowest total.",
    color: "pink",
    image: "grocery",
  },
  {
    badge: "Z",
    heading: "Zalo",
    body: "Useful when local contacts share their Zalo details. Message or make voice and video calls over the internet.",
    color: "blue",
    image: "zalo",
  },
  {
    badge: "M",
    heading: "Google Maps",
    body: "Save your campus, accommodation, and favourite spots. Keep Vietnamese place names and exact addresses for easier navigation.",
    color: "yellow",
    image: "map",
  },
];
export const studentTips: GuideTip[] = [
  {
    heading: "Campus access",
    body: "Ask your host university whether your card gives you access to libraries, study spaces, sports facilities, or equipment loans.",
    color: "mint",
  },
  {
    heading: "Transport savings",
    body: "Ask about student passes if you commute regularly. Metro Line 1 offers a student monthly fare; confirm eligibility and registration requirements before purchasing.",
    color: "pink",
  },
  {
    heading: "Culture for less",
    body: "Check student admission policies at museums and cultural venues. Bring your valid card and check whether advance registration is needed.",
    color: "yellow",
  },
  {
    heading: "Check age-based deals too",
    body: "Some cinema offers depend on your age and membership rather than student status. CGV’s FanC programme requires age verification.",
    color: "blue",
  },
  {
    heading: "Ask before paying",
    body: "“Do you accept international student IDs?” A host-university card and an overseas card may be treated differently.",
    color: "lavender",
  },
];
export const weatherTips: GuideTip[] = [
  {
    heading: "Know Saigon’s seasons",
    body: "The city stays warm year-round, with a rainy season generally from May to November. Afternoon showers are common.",
    color: "blue",
  },
  {
    heading: "Carry a mini rain kit",
    body: "A compact raincoat or umbrella and a waterproof pouch can save your afternoon.",
    color: "lavender",
  },
  {
    heading: "Plan around the heat",
    body: "Bring water, choose shaded routes, and leave longer outdoor walks for cooler parts of the day.",
    color: "peach",
  },
  {
    heading: "Keep an indoor backup",
    body: "Save a nearby café or museum for sudden downpours. Wait somewhere sheltered when visibility is poor.",
    color: "mint",
  },
  {
    heading: "Avoid flooded shortcuts",
    body: "Choose another route instead of walking or riding through water when you cannot judge its depth.",
    color: "pink",
  },
  {
    heading: "Travelling beyond Saigon?",
    body: "Check your destination’s forecast separately - Vietnam does not have one shared weather pattern.",
    color: "yellow",
  },
];
export const phrases: GuideTip[] = [
  { heading: "Bao nhiêu tiền?", body: "How much is it?", color: "mint" },
  { heading: "Ít ngọt, ít đá.", body: "Less sweet, less ice.", color: "pink" },
  { heading: "Không cay, nhé.", body: "Not spicy, please.", color: "yellow" },
  {
    heading: "Cho mình mang đi.",
    body: "To take away, please.",
    color: "blue",
  },
  {
    heading: "Tính tiền giúp mình.",
    body: "The bill, please.",
    color: "lavender",
  },
  { heading: "Cảm ơn!", body: "Thank you!", color: "peach" },
];
export const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
