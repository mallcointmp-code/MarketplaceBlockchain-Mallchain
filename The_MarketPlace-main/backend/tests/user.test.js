const User = require("../models/User");

describe("User Model", () => {
  it("should create a user with default values", async () => {
    const user = new User({ username: "testuser", email: "test@example.com", password: "password123" });
    expect(user.username).toBe("testuser");
    expect(user.email).toBe("test@example.com");
    expect(user.isAdmin).toBe(false);
  });
});