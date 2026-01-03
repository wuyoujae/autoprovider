<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { Calendar, ArrowRight } from "lucide-vue-next";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// 定义 Props
interface ChangelogItemProps {
  id: string | number;
  title: string;
  date: string;
  version: string;
  description: string;
  tags?: string[];
}

const props = defineProps<ChangelogItemProps>();
const router = useRouter();

// 日期格式化：优先截取 ISO 日期前 10 位，否则按本地转 YYYY-MM-DD
const formattedDate = computed(() => {
  const raw = props.date;
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) return raw.slice(0, 10);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
});

// 跳转详情页
const go_to_detail = () => {
  router.push({ name: "changelog-detail", params: { id: props.id } });
};
</script>

<template>
  <Card class="changelog_card group" @click="go_to_detail">
    <CardHeader class="pb-2">
      <div class="flex items-center justify-between mb-2">
        <Badge variant="outline" class="version_badge">{{ version }}</Badge>
        <div class="date_info">
          <Calendar class="w-4 h-4 mr-1" />
          <span>{{ formattedDate }}</span>
        </div>
      </div>
      <CardTitle class="item_title text-2xl text-white transition-colors">
        {{ title }}
      </CardTitle>
    </CardHeader>
    <CardContent class="pb-4">
      <p class="description text-gray-400 line-clamp-3">
        {{ description }}
      </p>
      <div class="tags mt-4 flex gap-2 flex-wrap" v-if="tags && tags.length">
        <span v-for="tag in tags" :key="tag" class="tag">#{{ tag }}</span>
      </div>
    </CardContent>
    <CardFooter>
      <Button variant="ghost" class="read_more pl-0 hover:bg-transparent">
        Read more <ArrowRight class="ml-2 w-4 h-4" />
      </Button>
    </CardFooter>
  </Card>
</template>

<style scoped lang="scss">
.changelog_card {
  background-color: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;

  // 默认状态下标题颜色
  .item_title {
    color: #fff;
  }

  // 默认状态下 read more 颜色
  .read_more {
    color: #afb3bc;
  }

  &:hover {
    transform: translateY(-4px);
    // Hover 背景色：使用暖色调的极淡版本，增加与深色背景的对比
    background-color: rgba(254, 238, 222, 0.08);
    border-color: rgba(254, 238, 222, 0.3);
    box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);

    // Hover 标题颜色：使用高亮暖色
    .item_title {
      color: #feeede;
    }

    // Hover 描述文字颜色：稍微提亮
    .description {
      color: rgba(255, 255, 255, 0.9);
    }

    // Hover 按钮颜色：使用粉色调高亮
    .read_more {
      color: #fdc4c4;
    }

    // Hover 标签背景
    .tag {
      background-color: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
  }
}

.version_badge {
  background-color: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-family: "Source Serif 4", serif;
}

.date_info {
  display: flex;
  align-items: center;
  color: #afb3bc;
  font-size: 0.875rem;
}

.description {
  font-size: 1rem;
  line-height: 1.6;
  color: #afb3bc;
  transition: color 0.3s ease;
}

.tag {
  font-size: 0.75rem;
  color: #afb3bc;
  background-color: rgba(255, 255, 255, 0.05);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.read_more {
  font-weight: 500;
  transition: color 0.3s ease;
}
</style>
