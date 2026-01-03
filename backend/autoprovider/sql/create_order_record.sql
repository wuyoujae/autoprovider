-- 订单记录表
-- 用于记录用户的支付订单信息，包括积分购买和VIP充值
create table order_record
(
    order_id           varchar(50)                            not null comment '订单ID，由系统生成唯一标识'
        primary key,
    user_id            varchar(50)                            not null comment '用户ID，来源于user_info表的user_id',
    platform_order_no  varchar(100)                           not null comment '平台订单号，用于与第三方支付平台对接',
    external_order_no  varchar(100)                           null comment '第三方支付订单号，支付成功后由支付平台返回',
    payment_platform   varchar(20)                            not null comment '支付平台：alipay-支付宝，platform-平台内部支付',
    order_type         tinyint                                not null comment '订单类型：1-VIP充值，2-积分购买',
    order_content      varchar(200)                           null comment '订单内容描述，VIP充值时存储商品代码',
    order_amount       int                                    not null comment '订单数量，积分购买时为积分数量',
    order_price        decimal(10, 2)                         not null comment '订单金额（元）',
    order_status       tinyint      default 0                 null comment '订单状态：0-待支付，1-已支付，2-已取消，3-已过期',
    expire_time        datetime                               null comment '订单过期时间',
    pay_time           datetime                               null comment '支付时间',
    create_time        datetime     default CURRENT_TIMESTAMP null comment '创建时间'
)
    comment '订单记录表' collate = utf8mb4_unicode_ci;

-- 创建索引
create index idx_order_user_id
    on order_record (user_id)
    comment '用户ID索引，用于按用户查询订单';

create index idx_order_platform_no
    on order_record (platform_order_no)
    comment '平台订单号索引，用于支付回调查询';

create index idx_order_status
    on order_record (order_status)
    comment '订单状态索引，用于状态筛选';

create index idx_order_create_time
    on order_record (create_time)
    comment '创建时间索引，用于时间排序';

create index idx_order_user_status
    on order_record (user_id, order_status)
    comment '联合索引，按用户和状态查询';

create unique index uk_platform_order_no
    on order_record (platform_order_no)
    comment '平台订单号唯一索引';

