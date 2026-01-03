# 运行阶段（假设宿主机已执行 npm run build，产生 .next/standalone）
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# 将宿主机构建好的产物直接复制进镜像
COPY .next/standalone ./
COPY .next/static ./.next/static
COPY public ./public
# 保留 package.json 供运行时记录或健康检查（可选）
COPY package*.json ./

EXPOSE 3000
CMD ["node", "server.js"]