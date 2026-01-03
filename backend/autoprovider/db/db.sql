create table adv_content
(
    adv_id      varchar(50)                            not null comment '广告ID，唯一标识'
        primary key,
    adv_title   varchar(200) default ''                null comment '广告标题',
    adv_src     varchar(1000)                          not null comment '广告内容的iframe地址/HTML托管地址',
    adv_status  tinyint      default 0                 null comment '广告状态：0-正常，1-删除/下架',
    adv_version int          default 1                 null comment '广告版本号，方便排序',
    create_time datetime     default CURRENT_TIMESTAMP null comment '创建时间',
    update_time datetime     default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP comment '更新时间'
)
    comment '全局广告内容表' collate = utf8mb4_unicode_ci;

create index idx_adv_status_time
    on adv_content (adv_status, update_time);

create table changelog
(
    changelog_id varchar(50)                        not null comment 'changelog唯一ID（uuidv4）'
        primary key,
    version      varchar(50)                        not null comment '版本号，例如 v1.2.0',
    title        varchar(255)                       not null comment '标题',
    summary      text                               null comment '列表摘要/简述',
    content_html longtext                           not null comment '详情页 HTML 内容（可由 markdown 渲染后存储）',
    tags         json                               null comment '标签数组，示例 ["AI","Feature"]',
    release_date date                               not null comment '发布日期，用于时间线排序',
    status       tinyint  default 0                 null comment '状态：0-已发布，1-草稿，2-删除',
    create_time  datetime default CURRENT_TIMESTAMP null comment '创建时间',
    update_time  datetime default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP comment '更新时间'
)
    comment '更新日志表' collate = utf8mb4_unicode_ci;

create index idx_changelog_status_date
    on changelog (status, release_date);

create index idx_changelog_version
    on changelog (version);

create table llm_model_config
(
    id          int auto_increment comment '自增主键'
        primary key,
    model_type  varchar(20)                        not null comment '模型用途类型：agent/editfile',
    provider    varchar(100)                       not null comment '模型供应商名称',
    base_url    varchar(500)                       not null comment 'API Base URL',
    api_key     varchar(500)                       not null comment 'API Key',
    model       varchar(200)                       not null comment '模型名称',
    token_limit int                                null comment 'Token 上限（可选）',
    order_no    int          default 0             null comment '优先级顺序（越小优先级越高）',
    status      tinyint      default 0             null comment '状态：0-启用，1-删除',
    create_time datetime     default CURRENT_TIMESTAMP null comment '创建时间',
    update_time datetime     default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP comment '更新时间'
)
    comment 'LLM 模型配置表' collate = utf8mb4_unicode_ci;

create index idx_llm_model_type_order
    on llm_model_config (model_type, order_no, status)
    comment '按类型和顺序查询';

create index idx_changelog_status_date
    on changelog (status, release_date);

create index idx_changelog_version
    on changelog (version);

create table token_usage_history
(
    record_id     varchar(50)                        not null comment '记录ID，由系统生成唯一标识'
        primary key,
    user_id       varchar(50)                        not null comment '用户ID，来源于user_info表的user_id',
    tokens_used  int                                not null comment '本次消耗的token数量（正整数）',
    usage_reason varchar(200)                       not null comment '使用原因描述',
    create_time   datetime default CURRENT_TIMESTAMP null comment '记录创建时间'
)
    comment 'Token 使用历史表' collate = utf8mb4_unicode_ci;

create index idx_token_usage_time
    on token_usage_history (create_time)
    comment '创建时间索引用于时间排序';

create index idx_token_usage_user_id
    on token_usage_history (user_id)
    comment '用户ID索引用于按用户查询记录';

create index idx_token_usage_user_time
    on token_usage_history (user_id, create_time)
    comment '联合索引，按用户和时间查询';

create table dialogue_record
(
    dialogue_id       varchar(50)                        not null comment '对话ID，由系统生成唯一标识'
        primary key,
    create_time       datetime default CURRENT_TIMESTAMP null comment '创建时间',
    role_type         varchar(20)                        not null comment '发起角色：user-用户，assistant-AI，tool-工具调用',
    content           text                               not null comment '对话内容，如果是tool角色，则是工具调用的结果',
    dialogue_status   tinyint  default 0                 null comment '对话状态：0-正常使用，1-已撤回',
    dialogue_index    int                                not null comment '对话索引，用于记录对话先后顺序，实现回撤功能',
    dialogue_sender   varchar(20)                        null comment '发送这条消息的平台，client和system，客户端和系统都可以使用user这个role给AI发送消息',
    tool_call_id      varchar(125)                       null comment '记录工具调用的tools id',
    work_id           varchar(50)                        null comment '对应的work',
    session_id        varchar(50)                        null,
    tool_call         text                               null,
    is_mini_model     int      default 0                 null comment '0是大模型的消息，1是小模型的消息',
    is_agent_generate int      default 0                 null comment '是否是AI生成的消息，0不是，1是',
    isCompress        int      default 0                 null comment '是否已经被压缩的信息，如果是将不会被加载，1是，0不是'
)
    comment '对话记录表' collate = utf8mb4_unicode_ci;

create index idx_dialogue_create_time
    on dialogue_record (create_time)
    comment '创建时间索引，用于时间排序';

create index idx_dialogue_index
    on dialogue_record (dialogue_index)
    comment '对话索引，用于排序';

create index idx_dialogue_status
    on dialogue_record (dialogue_status)
    comment '对话状态索引，用于状态筛选';

create index idx_role_type
    on dialogue_record (role_type)
    comment '角色类型索引';

create index idx_session_index
    on dialogue_record (dialogue_index)
    comment '联合索引，按会话和索引查询排序';

create index idx_session_status
    on dialogue_record (dialogue_status)
    comment '联合索引，按会话和状态查询';

create table mini_model_message
(
    mini_msg_id     varchar(50)                        not null comment '小模型消息ID，唯一标识'
        primary key,
    session_id      varchar(50)                        not null comment '会话ID，对应 session_record.session_id',
    work_id         varchar(50)                        null comment '工作ID，对应 work_record.work_id',
    dialogue_id     varchar(50)                        null comment '上游对话ID，对应 dialogue_record.dialogue_id',
    project_id      varchar(50)                        null comment '项目ID，对应 project_info.project_id',
    role_type       varchar(20)                        not null comment '角色：user/system/assistant/tool',
    message_content longtext                           not null comment '消息内容（原文，JSON时存字符串）',
    status          tinyint  default 0                 null comment '状态：0-正常，1-删除',
    create_time     datetime default CURRENT_TIMESTAMP null comment '创建时间',
    update_time     datetime default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP comment '更新时间',
    message_index   int                                null comment '消息顺序索引'
)
    comment '小模型消息记录表' collate = utf8mb4_unicode_ci;

create index idx_mini_msg_project_time
    on mini_model_message (project_id, create_time)
    comment '按项目+时间查询';

create index idx_mini_msg_role_time
    on mini_model_message (role_type, create_time)
    comment '按角色和时间查询';

create index idx_mini_msg_session_time
    on mini_model_message (session_id, create_time)
    comment '按会话+时间查询';

create index idx_mini_msg_status_time
    on mini_model_message (status, create_time)
    comment '状态+时间筛选';

create index idx_mini_msg_work_time
    on mini_model_message (work_id, create_time)
    comment '按工作+时间查询';

create table operation_manual
(
    manual_id      varchar(50)                        not null comment '操作手册ID'
        primary key,
    project_id     varchar(50)                        not null comment '项目ID',
    manual_content longtext                           not null comment '手册内容',
    status         tinyint  default 0                 null comment '状态：0-健康，1-不可用',
    create_time    datetime default CURRENT_TIMESTAMP null comment '创建时间',
    update_time    datetime default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP comment '最近更新时间'
)
    comment '操作手册表' collate = utf8mb4_unicode_ci;

create index idx_manual_project
    on operation_manual (project_id)
    comment '项目ID索引用于按项目查询';

create index idx_manual_status_time
    on operation_manual (status, update_time)
    comment '状态+更新时间联合索引用于筛选与排序';

create table operation_record
(
    operation_id     varchar(50)                        not null comment '操作ID，由系统生成唯一标识'
        primary key,
    dialogue_id      varchar(50)                        not null comment '对话ID，来源于dialogue_record表的dialogue_id',
    operation_code   longtext                           not null comment '操作代码，解析前整个方法标签的代码',
    create_time      datetime default CURRENT_TIMESTAMP null comment '创建时间',
    operation_method varchar(200)                       null comment '操作方法，操作的function名称',
    operation_status tinyint  default 0                 null comment '操作状态：0-正常应用，1-被回撤',
    operation_index  int                                null
)
    comment '操作记录表' collate = utf8mb4_unicode_ci;

create index idx_dialogue_status
    on operation_record (dialogue_id, operation_status)
    comment '联合索引，按对话和状态查询';

create index idx_operation_create_time
    on operation_record (create_time)
    comment '创建时间索引，用于时间排序';

create index idx_operation_dialogue_id
    on operation_record (dialogue_id)
    comment '对话ID索引，用于按对话查询操作记录';

create index idx_operation_method
    on operation_record (operation_method)
    comment '操作方法索引，用于按方法名称查询';

create index idx_operation_status
    on operation_record (operation_status)
    comment '操作状态索引，用于状态筛选';

create table project_info
(
    project_id     varchar(50)                            not null comment '项目ID，由系统生成唯一标识'
        primary key,
    author_id      varchar(50)                            not null comment '作者ID，来源于user_info表的user_id',
    project_name   varchar(200) default '新项目'          null comment '项目名称',
    project_icon   varchar(500) default ''                null comment '项目图标地址',
    project_url    varchar(500) default ''                null comment '项目访问地址',
    project_status tinyint      default 0                 null comment '项目状态：0-使用中，1-已删除',
    create_time    datetime     default CURRENT_TIMESTAMP null comment '创建时间',
    dokploy_id     varchar(50)                            null,
    backend_url    varchar(500)                           null,
    db_id          varchar(50)                            null comment '在dokploy中的数据库的容器id',
    project_type   tinyint      default 0                 null comment '项目类型，0是Web，1是app，2是desktop'
)
    comment '项目信息表' collate = utf8mb4_unicode_ci;

create index idx_author_id
    on project_info (author_id)
    comment '作者ID索引，用于按作者查询';

create index idx_author_status
    on project_info (author_id, project_status)
    comment '联合索引，按作者和状态查询';

create index idx_create_time
    on project_info (create_time)
    comment '创建时间索引，用于时间排序';

create index idx_project_status
    on project_info (project_status)
    comment '项目状态索引，用于状态筛选';

create table requirement_doc
(
    requirement_doc_id varchar(50)                        not null comment '需求文档ID'
        primary key,
    project_id         varchar(50)                        not null comment '项目ID',
    doc_content        longtext                           not null comment '文档内容',
    status             tinyint  default 0                 null comment '状态：0-健康，1-不可用',
    create_time        datetime default CURRENT_TIMESTAMP null comment '创建时间',
    update_time        datetime default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP comment '最新更新时间'
)
    comment '需求分析文档表' collate = utf8mb4_unicode_ci;

create index idx_requirement_project
    on requirement_doc (project_id)
    comment '项目ID索引用于按项目查询';

create index idx_requirement_status_time
    on requirement_doc (status, update_time)
    comment '状态+更新时间联合索引用于筛选与排序';

create table requirement_result
(
    result_id       varchar(50)                        not null comment '结果产物ID'
        primary key,
    work_id         varchar(50)                        not null comment '工作ID',
    product_content longtext                           not null comment '产物内容',
    product_status  tinyint  default 0                 null comment '产物状态：0-正常使用，1-完成使用',
    create_time     datetime default CURRENT_TIMESTAMP null comment '创建时间'
)
    comment '需求分析结果产物表' collate = utf8mb4_unicode_ci;

create index idx_result_status_time
    on requirement_result (product_status, create_time)
    comment '按状态与时间筛选';

create index idx_result_work
    on requirement_result (work_id)
    comment '按工作ID查询';

create table rules_config
(
    rule_id           varchar(50)                        not null comment '规则ID'
        primary key,
    project_id        varchar(50)                        not null comment '项目ID',
    rule_content      longtext                           not null comment '规则内容（JSON或纯文本）',
    rule_version      int      default 1                 null comment '规则版本号，save时自增',
    rule_status       tinyint  default 0                 null comment '规则状态：0正常，1删除',
    create_time       datetime default CURRENT_TIMESTAMP null comment '创建时间',
    update_time       datetime default CURRENT_TIMESTAMP null on update CURRENT_TIMESTAMP comment '更新时间',
    active_project_id varchar(50) as ((case when (`rule_status` = 0) then `project_id` else NULL end)) stored comment '仅对状态为正常的规则生成唯一键',
    constraint uniq_rules_active_project
        unique (active_project_id) comment '同一项目仅允许一条状态为正常的规则记录'
)
    comment '项目规则配置表' collate = utf8mb4_unicode_ci;

create index idx_rules_project_status
    on rules_config (project_id, rule_status)
    comment '按项目与状态查询';

create index idx_rules_update_time
    on rules_config (update_time)
    comment '更新时间索引';

create table session_record
(
    session_id     varchar(50)                            not null comment '会话ID，由系统生成唯一标识'
        primary key,
    project_id     varchar(50)                            not null comment '所属项目ID，来源于project_info表的project_id',
    session_title  varchar(200) default '新会话'          null comment '会话标题',
    session_status tinyint      default 0                 null comment '会话状态：0-正常使用，1-已删除',
    create_time    datetime     default CURRENT_TIMESTAMP null comment '创建时间'
)
    comment '会话记录表' collate = utf8mb4_unicode_ci;

create index idx_create_time
    on session_record (create_time)
    comment '创建时间索引，用于时间排序';

create index idx_project_id
    on session_record (project_id)
    comment '项目ID索引，用于按项目查询会话';

create index idx_project_status
    on session_record (project_id, session_status)
    comment '联合索引，按项目和状态查询';

create index idx_session_create_time
    on session_record (create_time)
    comment '创建时间索引，用于时间排序';

create index idx_session_project_id
    on session_record (project_id)
    comment '项目ID索引，用于按项目查询会话';

create index idx_session_status
    on session_record (session_status)
    comment '会话状态索引，用于状态筛选';

create table source_list
(
    source_id      varchar(50)                            not null comment '资源ID，由系统生成唯一标识'
        primary key,
    source_url     varchar(500) default ''                null comment '资源访问地址',
    source_type    varchar(50)                            not null comment '资源类型，如：docx、pdf、image等',
    project_id     varchar(50)                            null comment '所属项目ID，来源于project_info表的project_id',
    source_status  tinyint      default 0                 null comment '资源状态：0-正常使用，1-已删除',
    create_time    datetime     default CURRENT_TIMESTAMP null comment '创建时间',
    source_content longtext                               null,
    own_user_id    varchar(50)                            null comment '上传的用户',
    file_size      varchar(30)                            null comment '文件的大小',
    dialogue_id    varchar(50)                            null,
    session_id     varchar(50)                            null comment '所属的session_id',
    source_name    varchar(50)                            null comment '资源名称'
)
    comment '资源列表表' collate = utf8mb4_unicode_ci;

create index idx_create_time
    on source_list (create_time)
    comment '创建时间索引，用于时间排序';

create index idx_project_id
    on source_list (project_id)
    comment '项目ID索引，用于按项目查询资源';

create index idx_project_status
    on source_list (project_id, source_status)
    comment '联合索引，按项目和状态查询';

create index idx_source_status
    on source_list (source_status)
    comment '资源状态索引，用于状态筛选';

create index idx_source_type
    on source_list (source_type)
    comment '资源类型索引，用于按类型筛选';

create index idx_type_status
    on source_list (source_type, source_status)
    comment '联合索引，按类型和状态查询';

create table todo
(
    todo_id     varchar(50)                            not null comment '待办项ID，由系统生成唯一标识'
        primary key,
    todolist_id varchar(50)                            not null comment '所属待办列表ID，来源于todolist表的todolist_id',
    todo_title  varchar(200) default ''                null comment '待办项标题',
    todo_desc   text                                   null comment '待办项描述',
    todo_status tinyint      default 0                 null comment '待办项状态：0-未完成，1-完成，2-异常',
    create_time datetime     default CURRENT_TIMESTAMP null comment '创建时间'
)
    comment '待办项表' collate = utf8mb4_unicode_ci;

create index idx_create_time
    on todo (create_time)
    comment '创建时间索引，用于时间排序';

create index idx_list_status
    on todo (todolist_id, todo_status)
    comment '联合索引，按待办列表和状态查询';

create index idx_todo_status
    on todo (todo_status)
    comment '待办项状态索引，用于状态筛选';

create index idx_todolist_id
    on todo (todolist_id)
    comment '待办列表ID索引，用于按列表查询待办项';

create table todolist
(
    todolist_id     varchar(50)                            not null comment '待办列表ID，由系统生成唯一标识'
        primary key,
    session_id      varchar(50)                            not null comment '会话ID，绑定到特定会话',
    todolist_name   varchar(200) default '待办列表'        null comment '待办列表名称',
    todolist_status tinyint      default 0                 null comment '待办列表状态：0-进行中，1-全部完成，2-异常',
    create_time     datetime     default CURRENT_TIMESTAMP null comment '创建时间'
)
    comment '待办列表表' collate = utf8mb4_unicode_ci;

create index idx_create_time
    on todolist (create_time)
    comment '创建时间索引，用于时间排序';

create index idx_session_id
    on todolist (session_id)
    comment '会话ID索引，用于按会话查询待办列表';

create index idx_session_status
    on todolist (session_id, todolist_status)
    comment '联合索引，按会话和状态查询';

create index idx_todolist_status
    on todolist (todolist_status)
    comment '待办列表状态索引，用于状态筛选';

create table user_info
(
    user_id     varchar(50)                                                         not null comment '用户ID'
        primary key,
    account     varchar(100)                                                        not null comment '账号',
    username    varchar(100)                                                        not null comment '用户名',
    create_time datetime                                  default CURRENT_TIMESTAMP null comment '创建时间',
    status      int                                       default 0                 null comment '账号状态，0是正常使用，1是已注销',
    constraint uk_account
        unique (account)
)
    comment '用户信息表' collate = utf8mb4_unicode_ci;

create index idx_create_time
    on user_info (create_time);

create table user_vec
(
    vec_id      varchar(50)                        not null comment '向量ID'
        primary key,
    account     varchar(100)                       not null comment '账号',
    password    varchar(255)                       not null comment '密码',
    create_time datetime default CURRENT_TIMESTAMP null comment '创建时间',
    constraint uk_account
        unique (account)
)
    comment '用户向量表' collate = utf8mb4_unicode_ci;

create index idx_account
    on user_vec (account);

create index idx_create_time
    on user_vec (create_time);

create table work_record
(
    work_id                 varchar(50)                        not null comment '工作id'
        primary key,
    create_time             datetime default CURRENT_TIMESTAMP not null comment '工作开始时间',
    work_status             tinyint  default 0                 null comment '工作状态，0是正常，1是操作撤回',
    session_id              varchar(50)                        null comment '对应的session的id',
    work_index              int                                null,
    last_prompt_tokens      int      default 0                 null comment '最后一次请求的输入token数',
    last_completion_tokens  int      default 0                 null comment '最后一次请求的输出token数',
    total_prompt_tokens     int      default 0                 null comment '该工作累计输入token数',
    total_completion_tokens int      default 0                 null comment '该工作累计输出token数'
)
    comment '工作记录，一个工作包含多个dialogue';

create index idx_work_session_id
    on work_record (session_id);

