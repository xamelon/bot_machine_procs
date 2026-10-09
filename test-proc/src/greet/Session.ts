// A module adds fields to the one session every call carries: genTypes merges
// every Session.ts into one interface, so nobody overrides anybody.
export type Session = { greeted?: boolean };
