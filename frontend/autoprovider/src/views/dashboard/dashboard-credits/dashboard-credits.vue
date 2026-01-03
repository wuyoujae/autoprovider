<template>
  <div class="dashboard-tokens">
    <!-- 页面标题 -->
    <div class="dashboard-tokens__header">
      <div class="dashboard-tokens__title-section">
        <h1 class="dashboard-tokens__title">{{ t("tokens.title") }}</h1>
        <p class="dashboard-tokens__subtitle">{{ t("tokens.subtitle") }}</p>
    </div>

      <!-- 统计信息卡片 -->
      <div class="dashboard-tokens__stats">
        <div class="dashboard-tokens__stat-card">
          <div class="dashboard-tokens__stat-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div class="dashboard-tokens__stat-content">
            <div class="dashboard-tokens__stat-label">{{ t("tokens.totalUsed") }}</div>
            <div class="dashboard-tokens__stat-value">
              {{ pagination.total.toLocaleString() }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Token 使用历史表格 -->
    <DashboardTokenHistoryTable
      :token-history="token_history"
      :pagination="pagination"
      :is-loading="is_loading_history"
      @page-change="handlePageChange"
      @date-change="handleDateChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useUserStore } from "@/stores/user";
import request from "@/api/request";
import DashboardTokenHistoryTable from "@/components/views/dashboard/dashboard-credits/dashboard-credits-history-table.vue";

const { t } = useI18n();
const user_store = useUserStore();

// Token 使用历史数据
interface TokenHistoryItem {
  id: string;
  date: Date;
  tokensUsed: number;
  reason: string;
}

const token_history = ref<TokenHistoryItem[]>([]);

// 分页信息
const pagination = ref({
  page: 1,
  page_size: 10,
  total: 0,
  total_pages: 0,
});

// 加载状态
const is_loading_history = ref(false);

// 获取用户 Token 使用历史
const fetch_token_history = async (
  page: number = 1,
  page_size: number = 10,
  date?: string
) => {
  if (is_loading_history.value) return;

  is_loading_history.value = true;
  try {
    const result = await request({
      url: "userinfo.getusertokenhistory",
      method: "post",
      data: {
        page,
        page_size,
        date: date || undefined,
      },
      showSuccessMessage: false,
      showErrorMessage: true,
    });

    if (result) {
      // 转换数据格式
      token_history.value = result.list.map((item: any) => {
        return {
          id: item.record_id,
          date: new Date(item.create_time),
          tokensUsed: item.tokens_used,
          reason: item.usage_reason,
        };
      });

      // 更新分页信息
      pagination.value = {
        page: result.page || page,
        page_size: result.page_size || page_size,
        total: result.total || 0,
        total_pages: result.total_pages || 0,
      };
    }
  } catch (error) {
    console.error("获取用户 Token 使用历史失败:", error);
  } finally {
    is_loading_history.value = false;
  }
};

// 当前筛选状态
const current_filter = ref<{
  date?: string;
}>({});

// 处理分页变化
const handlePageChange = (page: number) => {
  fetch_token_history(
    page,
    pagination.value.page_size,
    current_filter.value.date
  );
};

// 处理日期变化
const handleDateChange = (date?: string) => {
  current_filter.value.date = date;
  // 日期筛选时重置到第一页
  fetch_token_history(1, pagination.value.page_size, date);
};

// 组件挂载时初始化
onMounted(async () => {
  // 如果已登录但没有完整的用户信息，则重新获取
  if (user_store.is_logged_in() && !user_store.user_info) {
    await user_store.fetch_user_info();
  }

  // 获取 Token 使用历史
  await fetch_token_history();
});
</script>

<style lang="scss" scoped>
.dashboard-tokens {
  padding: 0;

  &__header {
    margin-bottom: 2rem;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 2rem;

    @media (max-width: 1024px) {
      flex-direction: column;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }

    @media (max-width: 768px) {
      gap: 1.25rem;
      margin-bottom: 1.25rem;
    }
  }

  &__title-section {
    flex: 1;
  }

  &__title {
    font-size: 2rem;
    font-weight: 600;
    color: #fff;
    margin: 0 0 0.5rem 0;

    @media (max-width: 1024px) {
      font-size: 1.75rem;
    }

    @media (max-width: 768px) {
      font-size: 1.5rem;
    }

    @media (max-width: 480px) {
      font-size: 1.25rem;
    }
  }

  &__subtitle {
    font-size: 1rem;
    color: #afb3bc;
    margin: 0;

    @media (max-width: 1024px) {
      font-size: 0.9375rem;
    }

    @media (max-width: 768px) {
      font-size: 0.875rem;
    }

    @media (max-width: 480px) {
      font-size: 0.8125rem;
    }
  }

  &__stats {
    display: flex;
    gap: 1rem;

    @media (max-width: 1024px) {
      width: 100%;
    }
  }

  &__stat-card {
    background: linear-gradient(135deg, #242429 0%, #2a2a2f 100%);
    border: 1px solid #3a3a3f;
    border-radius: 0.75rem;
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: all 0.3s ease;
    min-width: 200px;

    &:hover {
      border-color: #feeede;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(254, 238, 222, 0.1);
    }

    @media (max-width: 1024px) {
      flex: 1;
    }

    @media (max-width: 768px) {
      padding: 1.25rem;
      min-width: auto;
    }

    @media (max-width: 480px) {
      padding: 1rem;
      gap: 0.75rem;
    }
  }

  &__stat-icon {
    width: 48px;
    height: 48px;
    background: rgba(254, 238, 222, 0.1);
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    svg {
      color: #feeede;
    }

    @media (max-width: 480px) {
      width: 40px;
      height: 40px;

      svg {
        width: 20px;
        height: 20px;
    }
  }
}

  &__stat-content {
    flex: 1;
    min-width: 0;
  }

  &__stat-label {
    font-size: 0.875rem;
    color: #afb3bc;
    margin-bottom: 0.25rem;

    @media (max-width: 480px) {
      font-size: 0.8125rem;
    }
    }

  &__stat-value {
    font-size: 1.75rem;
    font-weight: 700;
    color: #feeede;
    line-height: 1;

@media (max-width: 768px) {
      font-size: 1.5rem;
    }

@media (max-width: 480px) {
      font-size: 1.25rem;
    }
  }
}

// 全局样式覆盖 Card 组件
:deep([data-slot="card"]) {
  background: linear-gradient(135deg, #242429 0%, #2a2a2f 100%) !important;
  border: 1px solid #3a3a3f !important;
  color: #fff !important;
}

:deep([data-slot="card-header"]) {
  background: transparent !important;
}

:deep([data-slot="card-content"]) {
  background: transparent !important;
  color: #fff !important;
}

// 覆盖 Table 组件的背景色
:deep(table) {
  background: #242429 !important;
  color: #fff !important;
}

:deep(thead) {
  background: linear-gradient(135deg, #242429 0%, #2a2a2f 100%) !important;
}

:deep(thead tr) {
  border-bottom: 1px solid #3a3a3f !important;
}

:deep(thead th) {
  background: linear-gradient(135deg, #242429 0%, #2a2a2f 100%) !important;
  color: #fff !important;
  font-weight: 600 !important;
  border-bottom: 1px solid #3a3a3f !important;
}

:deep(tbody) {
  background: #242429 !important;
}

:deep(tbody tr) {
  background: #242429 !important;
  border-bottom: 1px solid #2a2a2f !important;
  transition: background 0.2s ease !important;

  &:hover {
    background: rgba(254, 238, 222, 0.05) !important;
  }
}

:deep(tbody td) {
  background: #242429 !important;
  color: #fff !important;
}
</style>
