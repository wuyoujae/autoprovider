<template>
  <div class="dashboard-token-history">
    <Card>
      <CardHeader>
        <div class="dashboard-token-history__header">
          <CardTitle>{{ t("tokens.historyTitle") }}</CardTitle>
          <div class="dashboard-token-history__controls">
            <!-- Date Picker -->
            <div class="dashboard-token-history__date-picker">
              <Button
                variant="outline"
                class="dashboard-token-history__date-button"
                @click="toggleCalendar"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="dashboard-token-history__date-icon"
                >
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
                {{
                  selectedDate
                    ? formatDateShort(selectedDate)
                    : t("tokens.selectDate")
                }}
              </Button>
              <div
                v-if="showCalendar"
                class="dashboard-token-history__calendar-popup"
              >
                <Calendar
                  v-model="selectedDate"
                  class="dashboard-token-history__calendar"
                  @update:model-value="handleDateSelect"
                />
                <Button
                  variant="outline"
                  size="sm"
                  class="dashboard-token-history__clear-date"
                  @click="clearDate"
                >
                  {{ t("tokens.allDates") }}
                </Button>
              </div>
            </div>

            <!-- Export CSV Button -->
            <Button
              variant="default"
              class="dashboard-token-history__export-btn"
              @click="exportToCSV"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="dashboard-token-history__export-icon"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" x2="12" y1="15" y2="3" />
              </svg>
              <span class="dashboard-token-history__export-text">{{
                t("tokens.exportCsv")
              }}</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          v-if="!props.isLoading && tokenHistory.length === 0"
          class="dashboard-token-history__empty"
        >
          <div class="dashboard-token-history__empty-content">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="dashboard-token-history__empty-icon"
            >
              <path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
              <path d="M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0z" />
            </svg>
            <h3>{{ t("tokens.empty.title") }}</h3>
            <p>{{ t("tokens.empty.description") }}</p>
          </div>
        </div>
        <div v-else-if="props.isLoading" class="dashboard-token-history__loading">
          <div class="dashboard-token-history__loading-content">
            <div class="dashboard-token-history__spinner"></div>
            <p>{{ t("tokens.loading") || "加载中..." }}</p>
          </div>
        </div>
        <div v-else class="dashboard-token-history__table-wrapper">
          <div class="dashboard-token-history__table-container">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{{ t("tokens.date") }}</TableHead>
                  <TableHead>{{ t("tokens.tokensUsed") }}</TableHead>
                  <TableHead>{{ t("tokens.reason") }}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="item in tokenHistory"
                  :key="item.id"
                  class="dashboard-token-history__table-row"
                >
                  <TableCell class="dashboard-token-history__date-cell">
                    {{ formatDate(item.date) }}
                  </TableCell>
                  <TableCell class="dashboard-token-history__amount-cell">
                    {{ item.tokensUsed.toLocaleString() }}
                  </TableCell>
                  <TableCell class="dashboard-token-history__description-cell">
                    {{ item.reason }}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <!-- 分页组件 -->
          <div
            v-if="props.pagination.total_pages > 0"
            class="dashboard-token-history__pagination"
          >
            <div class="dashboard-token-history__pagination-info">
              <span>
                {{
                  t("tokens.pagination.info", {
                    current: props.pagination.page,
                    total: props.pagination.total_pages,
                    count: props.pagination.total,
                  }) ||
                  `第 ${props.pagination.page} / ${props.pagination.total_pages} 页，共 ${props.pagination.total} 条`
                }}
              </span>
            </div>
            <div class="dashboard-token-history__pagination-controls">
              <Button
                variant="outline"
                :disabled="props.pagination.page <= 1 || props.isLoading"
                @click="emit('page-change', props.pagination.page - 1)"
              >
                {{ t("tokens.pagination.previous") || "上一页" }}
              </Button>
              <span class="dashboard-token-history__pagination-page">
                {{ props.pagination.page }} / {{ props.pagination.total_pages }}
              </span>
              <Button
                variant="outline"
                :disabled="
                  props.pagination.page >= props.pagination.total_pages ||
                  props.isLoading
                "
                @click="emit('page-change', props.pagination.page + 1)"
              >
                {{ t("tokens.pagination.next") || "下一页" }}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TokenHistoryItem {
  id: string;
  date: Date;
  tokensUsed: number;
  reason: string;
}

interface PaginationInfo {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

interface Props {
  tokenHistory: TokenHistoryItem[];
  pagination?: PaginationInfo;
  isLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  pagination: () => ({
    page: 1,
    page_size: 10,
    total: 0,
    total_pages: 0,
  }),
  isLoading: false,
});

const emit = defineEmits<{
  "page-change": [page: number];
  "date-change": [date?: string];
}>();

const { t } = useI18n();

// Filter states
const selectedDate = ref<any>(undefined);
const showCalendar = ref(false);

// Format date for display
const formatDate = (date: Date) => {
  const d = new Date(date);
  return d.toLocaleDateString(t("language.zh") === "中文" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Format date short (for button)
const formatDateShort = (dateValue: any) => {
  if (!dateValue) return "";

  // 处理不同的日期格式
  let date: Date;
  if (dateValue instanceof Date) {
    date = dateValue;
  } else if (dateValue.year && dateValue.month && dateValue.day) {
    // DateValue 格式 { year, month, day }
    date = new Date(dateValue.year, dateValue.month - 1, dateValue.day);
  } else if (typeof dateValue === "string") {
    date = new Date(dateValue);
  } else {
    return "";
  }

  return date.toLocaleDateString(
    t("language.zh") === "中文" ? "zh-CN" : "en-US",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  );
};

// Toggle calendar visibility
const toggleCalendar = () => {
  showCalendar.value = !showCalendar.value;
};

// Handle date selection
const handleDateSelect = (date: any) => {
  selectedDate.value = date;
  showCalendar.value = false;

  // 将日期转换为字符串格式 (YYYY-MM-DD) 发送给父组件
  let dateString: string | undefined;
  if (date) {
    if (date instanceof Date) {
      dateString = date.toISOString().split("T")[0];
    } else if (date.year && date.month && date.day) {
      // DateValue 格式 { year, month, day }
      const year = date.year;
      const month = String(date.month).padStart(2, "0");
      const day = String(date.day).padStart(2, "0");
      dateString = `${year}-${month}-${day}`;
    } else if (typeof date === "string") {
      dateString = date.split("T")[0];
    }
  }

  emit("date-change", dateString);
};

// Clear date filter
const clearDate = () => {
  selectedDate.value = undefined;
  showCalendar.value = false;
  emit("date-change", undefined);
};

// Close calendar on outside click
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest(".dashboard-token-history__date-picker")) {
    showCalendar.value = false;
  }
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
});

// Export to CSV
const exportToCSV = () => {
  const headers = [
    t("tokens.date"),
    t("tokens.tokensUsed"),
    t("tokens.reason"),
  ];

  const rows = props.tokenHistory.map((item) => [
    formatDate(item.date),
    item.tokensUsed.toString(),
    item.reason,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  const blob = new Blob(["\ufeff" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `token-usage-history-${new Date().toISOString().split("T")[0]}.csv`
  );
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
</script>

<style lang="scss">
// Global styles for Table component
.dashboard-token-history__table-wrapper {
  width: 100% !important;
  max-width: 100% !important;
  overflow: hidden !important;
}

.dashboard-token-history__table-container {
  width: 100% !important;
  overflow-x: auto !important;
  overflow-y: visible !important;
  -webkit-overflow-scrolling: touch !important;

  table {
    width: 100% !important;
    border-collapse: separate !important;
    border-spacing: 0 !important;
    background: transparent !important;

    @media (max-width: 768px) {
      display: table !important;
      table-layout: auto !important;
    }
  }

  thead,
  tbody,
  tr,
  th,
  td {
    background: transparent !important;
    border-color: #3a3a3f !important;
  }

  thead tr {
    border-bottom: 1px solid #3a3a3f !important;
  }

  tbody tr {
    border-bottom: 1px solid #2a2a2f !important;
    transition: background-color 0.2s ease;

    &:hover {
      background: rgba(254, 238, 222, 0.05) !important;
    }

    &:last-child {
      border-bottom: none !important;
    }
  }

  th {
    color: #afb3bc !important;
    background: transparent !important;
    padding: 0.875rem 1rem !important;
    font-size: 0.75rem !important;
    font-weight: 600 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.05em !important;
    white-space: nowrap !important;

    @media (max-width: 768px) {
      padding: 0.75rem 0.75rem !important;
      font-size: 0.6875rem !important;
    }
  }

  td {
    color: #fff !important;
    background: transparent !important;
    padding: 0.875rem 1rem !important;
    font-size: 0.875rem !important;

    @media (max-width: 768px) {
      padding: 0.75rem 0.75rem !important;
      font-size: 0.8125rem !important;
    }
  }
}
</style>

<style lang="scss" scoped>
.dashboard-token-history {
  width: 100%;

  @media (max-width: 1024px) {
    margin-top: 1.5rem;
  }

  @media (max-width: 768px) {
    margin-top: 1.25rem;
  }
}

.dashboard-token-history__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;

  @media (max-width: 1024px) {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
}

.dashboard-token-history__controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    width: 100%;
    gap: 0.5rem;
  }

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: stretch;
  }
}

.dashboard-token-history__date-picker {
  position: relative;

  @media (max-width: 480px) {
    width: 100%;
  }
}

.dashboard-token-history__date-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 180px;
  background: #2a2a2f;
  border: 1px solid #3a3a3f;
  color: #fff;
  transition: all 0.2s ease;

  &:hover {
    background: #2f2f34;
    border-color: #4a4a4f;
  }

  &:focus {
    border-color: #feeede;
    box-shadow: 0 0 0 2px rgba(254, 238, 222, 0.1);
  }

  @media (max-width: 480px) {
    width: 100%;
    justify-content: center;
  }
}

.dashboard-token-history__date-icon {
  flex-shrink: 0;
}

.dashboard-token-history__calendar-popup {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  z-index: 50;
  background: #1a1a1f;
  border: 1px solid #3a3a3f;
  border-radius: 0.5rem;
  padding: 1rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);

  @media (max-width: 768px) {
    left: 50%;
    transform: translateX(-50%);
  }

  @media (max-width: 480px) {
    left: 0;
    right: 0;
    transform: none;
  }
}

.dashboard-token-history__calendar {
  background: transparent;
  border: none;
}

.dashboard-token-history__clear-date {
  width: 100%;
  margin-top: 0.5rem;
  background: #2a2a2f;
  border: 1px solid #3a3a3f;
  color: #fff;

  &:hover {
    background: #2f2f34;
    border-color: #4a4a4f;
  }
}

.dashboard-token-history__export-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #feeede;
  color: #1a1a1f;
  font-weight: 600;
  transition: all 0.2s ease;

  &:hover {
    background: #fde5cc;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(254, 238, 222, 0.3);
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 480px) {
    width: 100%;
    justify-content: center;
  }
}

.dashboard-token-history__export-icon {
  flex-shrink: 0;
}

.dashboard-token-history__export-text {
  @media (max-width: 640px) {
    display: none;
  }
}

.dashboard-token-history__empty {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 5rem 1rem;
  text-align: center;

  @media (max-width: 768px) {
    padding: 4rem 1rem;
  }
}

.dashboard-token-history__empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;

  .dashboard-token-history__empty-icon {
    color: #afb3bc;
    opacity: 0.5;
  }

  h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #fff;
    margin: 0;

    @media (max-width: 480px) {
      font-size: 1.125rem;
    }
  }

  p {
    font-size: 0.875rem;
    color: #afb3bc;
    margin: 0;
    max-width: 400px;

    @media (max-width: 480px) {
      font-size: 0.8125rem;
    }
  }
}

.dashboard-token-history__table-container {
  &::-webkit-scrollbar {
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #2a2a2f;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #3a3a3f;
    border-radius: 4px;

    &:hover {
      background: #4a4a4f;
    }
  }

  @media (max-width: 768px) {
    &::-webkit-scrollbar {
      height: 6px;
    }

    tbody tr:hover {
      background: transparent !important;
    }
  }

  table {
    min-width: 600px;

    @media (max-width: 1024px) {
      min-width: 550px;
    }

    @media (max-width: 768px) {
      min-width: 500px;
    }

    @media (max-width: 480px) {
      min-width: 450px;
    }
  }
}

.dashboard-token-history__date-cell {
  font-size: 0.875rem;
  color: #afb3bc;
  white-space: nowrap;
  min-width: 150px;

  @media (max-width: 768px) {
    font-size: 0.8125rem;
    min-width: 130px;
  }

  @media (max-width: 480px) {
    font-size: 0.75rem;
    min-width: 110px;
  }
}

.dashboard-token-history__amount-cell {
  font-weight: 700;
  font-size: 1rem;
  white-space: nowrap;
  color: #feeede;
  min-width: 120px;

  @media (max-width: 768px) {
    font-size: 0.9375rem;
    min-width: 100px;
  }

  @media (max-width: 480px) {
    font-size: 0.875rem;
    min-width: 90px;
  }
}

.dashboard-token-history__description-cell {
  font-size: 0.875rem;
  color: #d1d5db;
  min-width: 200px;
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  @media (max-width: 1024px) {
    min-width: 180px;
    max-width: 320px;
  }

  @media (max-width: 768px) {
    min-width: 160px;
    max-width: 260px;
    font-size: 0.8125rem;
  }

  @media (max-width: 480px) {
    min-width: 140px;
    max-width: 200px;
    font-size: 0.75rem;
  }
}

.dashboard-token-history__loading {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 5rem 1rem;
  text-align: center;

  @media (max-width: 768px) {
    padding: 4rem 1rem;
  }
}

.dashboard-token-history__loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;

  p {
    font-size: 0.875rem;
    color: #afb3bc;
    margin: 0;

    @media (max-width: 480px) {
      font-size: 0.8125rem;
    }
  }
}

.dashboard-token-history__spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #3a3a3f;
  border-top-color: #feeede;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.dashboard-token-history__pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #3a3a3f;
  gap: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
}

.dashboard-token-history__pagination-info {
  font-size: 0.875rem;
  color: #afb3bc;

  @media (max-width: 768px) {
    text-align: center;
    font-size: 0.8125rem;
  }
}

.dashboard-token-history__pagination-controls {
  display: flex;
  align-items: center;
  gap: 1rem;

  @media (max-width: 768px) {
    justify-content: center;
  }
}

.dashboard-token-history__pagination-page {
  font-size: 0.875rem;
  color: #fff;
  font-weight: 600;
  min-width: 80px;
  text-align: center;

  @media (max-width: 480px) {
    font-size: 0.8125rem;
    min-width: 70px;
  }
}

.dashboard-token-history__pagination-controls button {
  background: #2a2a2f;
  border: 1px solid #3a3a3f;
  color: #fff;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: #2f2f34;
    border-color: #4a4a4f;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>

