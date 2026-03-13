package com.ysc.aicodegenerator.ai.chatmemory;

import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.ChatMessageDeserializer;
import dev.langchain4j.data.message.ChatMessageSerializer;
import dev.langchain4j.internal.ValidationUtils;
import dev.langchain4j.store.memory.chat.ChatMemoryStore;
import redis.clients.jedis.JedisPooled;
import redis.clients.jedis.Pipeline;
import redis.clients.jedis.json.DefaultGsonObjectMapper;
import redis.clients.jedis.json.JsonObjectMapper;

import java.util.ArrayList;
import java.util.List;


/**
 * 自定义 RedisChatMemoryStore，使用 Redis 原生字符串命令替代 JSON 专用命令
 */
public class MyRedisChatMemoryStore implements ChatMemoryStore {

    // 保留原代码的核心成员变量
    private final JedisPooled client;
    private final String keyPrefix;
    private final Long ttl;
    private JsonObjectMapper jsonMapper;

    // 构造方法（完全复用原逻辑，仅移除 JSON 命令依赖）
    public MyRedisChatMemoryStore(String host, Integer port, String user, String password) {
        this(host, port, user, password, "", 0L);
    }

    public MyRedisChatMemoryStore(String host, Integer port, String user, String password, String prefix, Long ttl) {
        // 参数校验（复用原逻辑）
        String finalHost = ValidationUtils.ensureNotBlank(host, "host");
        int finalPort = ValidationUtils.ensureNotNull(port, "port");

        // 初始化 Jedis 客户端（复用原连接逻辑）
        if (user != null) {
            String finalUser = ValidationUtils.ensureNotBlank(user, "user");
            String finalPassword = ValidationUtils.ensureNotBlank(password, "password");
            this.client = new JedisPooled(finalHost, finalPort, finalUser, finalPassword);
        } else {
            this.client = new JedisPooled(finalHost, finalPort);
        }

        // 初始化前缀和 TTL（复用原校验逻辑）
        this.keyPrefix = ValidationUtils.ensureNotNull(prefix, "prefix");
        this.ttl = ValidationUtils.ensureNotNull(ttl, "ttl");
        // 保留 JSON 解析器（用于对象和 JSON 字符串互转）
        this.jsonMapper = new DefaultGsonObjectMapper();
    }

    /**
     * 获取消息：替换 jsonGet 为 get 命令
     */
    @Override
    public List<ChatMessage> getMessages(Object memoryId) {
        // 从 Redis 获取原生字符串（替代 jsonGet）
        String json = this.client.get(this.toRedisKey(memoryId));
        // 复用原解析逻辑
        return json == null ? new ArrayList<>() : ChatMessageDeserializer.messagesFromJson(json);
    }

    /**
     * 更新消息：替换 jsonSet 为 set 命令，保留 pipeline 和 TTL 逻辑
     */
    @Override
    public void updateMessages(Object memoryId, List<ChatMessage> messages) {
        // 校验消息非空（复用原逻辑）
        List<ChatMessage> validatedMessages = ValidationUtils.ensureNotEmpty(messages, "messages");
        // 序列化为 JSON 字符串（复用原序列化逻辑）
        String json = ChatMessageSerializer.messagesToJson(validatedMessages);
        String key = this.toRedisKey(memoryId);
        String res;

        if (this.ttl > 0L) {
            // 使用 pipeline 批量执行 set + expire（复用原 pipeline 逻辑）
            try (Pipeline pipeline = this.client.pipelined()) {
                // 替换 jsonSet 为 set 命令
                pipeline.set(key, json);
                pipeline.expire(key, this.ttl);
                // 同步执行并获取结果
                List<Object> results = pipeline.syncAndReturnAll();
                res = results.get(0).toString();
            }
        } else {
            // 无 TTL 时直接 set
            res = this.client.set(key, json);
        }

        // 校验执行结果（复用原异常逻辑）
        if (!"OK".equals(res)) {
            throw new RuntimeException("Set memory error, msg=" + res);
        }
    }

    /**
     * 删除消息：替换 jsonDel 为 del 命令
     */
    @Override
    public void deleteMessages(Object memoryId) {
        // 替换 jsonDel 为 del 命令
        this.client.del(this.toRedisKey(memoryId));
    }

    // 复用原 key 拼接逻辑
    private String toRedisKey(Object memoryId) {
        String memoryIdStr = toMemoryIdString(memoryId);
        return this.keyPrefix + memoryIdStr;
    }

    // 复用原 memoryId 校验逻辑
    private String toMemoryIdString(Object memoryId) {
        if (memoryId == null || memoryId.toString().trim().isEmpty()) {
            throw new IllegalArgumentException("memoryId cannot be null or empty");
        }
        return memoryId.toString();
    }

    // 保留原建造者模式（方便外部调用）
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String host;
        private Integer port;
        private String user;
        private String password;
        private Long ttl = 0L;
        private String prefix = "";

        public Builder() {
        }

        public Builder host(String host) {
            this.host = host;
            return this;
        }

        public Builder port(Integer port) {
            this.port = port;
            return this;
        }

        public Builder user(String user) {
            this.user = user;
            return this;
        }

        public Builder password(String password) {
            this.password = password;
            return this;
        }

        public Builder ttl(Long ttl) {
            this.ttl = ttl;
            return this;
        }

        public Builder prefix(String prefix) {
            this.prefix = prefix;
            return this;
        }

        public MyRedisChatMemoryStore build() {
            return new MyRedisChatMemoryStore(this.host, this.port, this.user, this.password, this.prefix, this.ttl);
        }
    }
}

