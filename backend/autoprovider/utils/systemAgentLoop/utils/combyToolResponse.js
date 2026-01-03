const formpt = (tool_name) => {
  return `工具${tool_name}调用结果：`;
};

const combyToolResponse = (tool_name, content, fileName) => {
  const formattedContent = `
  \`\`\`${tool_name}--${fileName}
  ${content}
  \`\`\`

  `;
  // const message = [
  //   {
  //     role: "user",
  //     content: formattedContent,
  //   },
  //   {
  //     role: "assistant",
  //     content: "收到！",
  //   },
  // ];
  const message = [
    {
      role: "tool",
      tool_call_id: "call_abc123",
      content: formattedContent,
    },
  ];
  return message;
};

module.exports = combyToolResponse;
