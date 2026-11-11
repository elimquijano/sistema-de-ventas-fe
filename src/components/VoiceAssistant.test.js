import { sanitizeChatMessages } from "../utils/voiceAssistantMessages";

describe("sanitizeChatMessages", () => {
  test("preserves a complete tool call and all its responses", () => {
    const messages = [
      { role: "system", content: "system" },
      {
        role: "assistant",
        tool_calls: [
          { id: "call-1", type: "function", function: { name: "first" } },
          { id: "call-2", type: "function", function: { name: "second" } },
        ],
      },
      { role: "tool", tool_call_id: "call-1", content: "one" },
      { role: "tool", tool_call_id: "call-2", content: "two" },
      { role: "user", content: "next turn" },
    ];

    expect(sanitizeChatMessages(messages)).toEqual(messages);
  });

  test("drops an interrupted tool call and its partial responses, keeping the next user turn", () => {
    const system = { role: "system", content: "system" };
    const incompleteCall = {
      role: "assistant",
      tool_calls: [
        { id: "call-1", type: "function", function: { name: "first" } },
        { id: "call-2", type: "function", function: { name: "second" } },
      ],
    };
    const partialResponse = { role: "tool", tool_call_id: "call-1", content: "one" };
    const nextUserTurn = { role: "user", content: "continue with the missing data" };

    expect(sanitizeChatMessages([system, incompleteCall, partialResponse, nextUserTurn])).toEqual([
      system,
      nextUserTurn,
    ]);
  });

  test("removes orphan tool responses", () => {
    const user = { role: "user", content: "hello" };
    const orphanResponse = { role: "tool", tool_call_id: "missing-call", content: "orphan" };

    expect(sanitizeChatMessages([user, orphanResponse])).toEqual([user]);
  });
});
