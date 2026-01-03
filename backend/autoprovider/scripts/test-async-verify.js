const path = require('path');
const fs = require('fs');
const { createFile, readFile, deleteFile, bashOperation } = require('../utils/AIfunction');

(async () => {
  const projectId = 'test';
  const clientId = 'async-verify';
  const infoObject = { projectId, clientId };
  const testRelPath = '/tmp_async/test_async.txt';
  const baseDir = path.join(process.cwd(), 'projects', projectId, 'tmp_async');
  fs.mkdirSync(baseDir, { recursive: true });

  console.log('1) createFile');
  const createRes = await createFile({ file_names: [testRelPath] }, infoObject);
  console.log(createRes);

  console.log('2) readFile');
  const readRes = await readFile({ file_paths: [testRelPath] }, infoObject);
  console.log(readRes.message, readRes.data?.summary);

  console.log('3) bashOperation (echo)');
  const bashRes = await bashOperation({ commands: [ { working_directory: '/tmp_async', instruction: 'echo hello-async' } ] }, infoObject);
  console.log(bashRes.message, bashRes.data?.summary);

  console.log('4) deleteFile');
  const delRes = await deleteFile({ file_paths: [testRelPath] }, infoObject);
  console.log(delRes);
})();
