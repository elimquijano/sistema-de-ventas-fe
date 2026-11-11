export const sanitizeChatMessages = (messages = []) => {
  const sanitized = [];
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (message?.role === "tool") continue;
    if (message?.role !== "assistant" || !Array.isArray(message.tool_calls) || !message.tool_calls.length) {
      sanitized.push(message);
      continue;
    }
    const expected = new Set(message.tool_calls.map((call) => call.id));
    const toolMessages = [];
    let cursor = index + 1;
    while (cursor < messages.length && messages[cursor]?.role === "tool" && expected.has(messages[cursor].tool_call_id)) {
      expected.delete(messages[cursor].tool_call_id);
      toolMessages.push(messages[cursor]);
      cursor += 1;
    }
    if (expected.size === 0) {
      sanitized.push(message, ...toolMessages);
      index = cursor - 1;
    } else {
      index += toolMessages.length;
    }
  }
  return sanitized;
};
