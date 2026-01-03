//完成content2json功能

const content2json = (chatHistory) => {
  //   将内容转换成json格式
  const jsonContent = JSON.stringify(chatHistory);
  return jsonContent;
};

module.exports = content2json;
