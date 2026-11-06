package com.vision.qc.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vision.qc.service.BottleInspectionService;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

class MqttConfigTest {
    @Test
    void usesConfiguredBrokerAndCredentials() {
        MqttConfig config = new MqttConfig(mock(BottleInspectionService.class), new ObjectMapper());
        ReflectionTestUtils.setField(config, "brokerUrl", "tcp://test-broker:1884");
        ReflectionTestUtils.setField(config, "username", "test-user");
        ReflectionTestUtils.setField(config, "password", "test-only-password");
        var options = config.mqttClientFactory().getConnectionOptions();
        assertArrayEquals(new String[]{"tcp://test-broker:1884"}, options.getServerURIs());
        assertEquals("test-user", options.getUserName());
        assertArrayEquals("test-only-password".toCharArray(), options.getPassword());
        assertFalse(options.isCleanSession());
    }

    @Test
    void acknowledgesMqttOnlyAfterTheCommittedServiceResult() throws Exception {
        var service=org.mockito.Mockito.mock(BottleInspectionService.class);
        var mapper=new ObjectMapper().findAndRegisterModules();
        var config=new MqttConfig(service,mapper);
        var dto=new com.vision.qc.dto.BottleInspectionDto(java.util.UUID.randomUUID(),"line-1","pc-1",true,
            java.util.List.of(),.9,"test-model",com.vision.qc.dto.BottleInspectionDto.Source.CAMERA,java.time.Instant.now());
        var committed=reactor.core.publisher.Sinks.<com.vision.qc.entity.BottleInspection>one();
        var subscribed=new java.util.concurrent.CountDownLatch(1);
        org.mockito.Mockito.when(service.processInspection(dto)).thenReturn(committed.asMono().doOnSubscribe(s -> subscribed.countDown()));
        var ack=org.mockito.Mockito.mock(org.springframework.integration.acks.SimpleAcknowledgment.class);
        var message=org.springframework.messaging.support.MessageBuilder.withPayload(mapper.writeValueAsString(dto))
            .setHeader(org.springframework.integration.IntegrationMessageHeaderAccessor.ACKNOWLEDGMENT_CALLBACK,ack).build();
        try(var executor=java.util.concurrent.Executors.newSingleThreadExecutor()) {
            var result=executor.submit(() -> config.handler().handleMessage(message));
            assertTrue(subscribed.await(5,java.util.concurrent.TimeUnit.SECONDS));
            org.mockito.Mockito.verify(ack,org.mockito.Mockito.never()).acknowledge();
            committed.tryEmitValue(com.vision.qc.entity.BottleInspection.builder().id(1L).build());
            result.get(5,java.util.concurrent.TimeUnit.SECONDS);
            org.mockito.Mockito.verify(ack).acknowledge();
        }
    }
    @Test
    void leavesMqttUnacknowledgedWhenStorageFails() throws Exception {
        var service=org.mockito.Mockito.mock(BottleInspectionService.class);
        var mapper=new ObjectMapper().findAndRegisterModules();
        var config=new MqttConfig(service,mapper);
        var dto=new com.vision.qc.dto.BottleInspectionDto(java.util.UUID.randomUUID(),"line-1","pc-1",true,
            java.util.List.of(),.9,"test-model",com.vision.qc.dto.BottleInspectionDto.Source.CAMERA,java.time.Instant.now());
        org.mockito.Mockito.when(service.processInspection(dto)).thenReturn(reactor.core.publisher.Mono.error(new IllegalStateException("database offline")));
        var ack=org.mockito.Mockito.mock(org.springframework.integration.acks.SimpleAcknowledgment.class);
        var message=org.springframework.messaging.support.MessageBuilder.withPayload(mapper.writeValueAsString(dto))
            .setHeader(org.springframework.integration.IntegrationMessageHeaderAccessor.ACKNOWLEDGMENT_CALLBACK,ack).build();
        assertThrows(org.springframework.messaging.MessageHandlingException.class,() -> config.handler().handleMessage(message));
        org.mockito.Mockito.verify(ack,org.mockito.Mockito.never()).acknowledge();
    }
}
