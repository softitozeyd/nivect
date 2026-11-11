package com.vision.qc.config;

import com.vision.qc.dto.BottleInspectionDto;
import com.vision.qc.service.BottleInspectionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.integration.annotation.ServiceActivator;
import org.springframework.integration.channel.DirectChannel;
import org.springframework.integration.core.MessageProducer;
import org.springframework.integration.mqtt.inbound.MqttPahoMessageDrivenChannelAdapter;
import org.springframework.integration.mqtt.core.DefaultMqttPahoClientFactory;
import org.springframework.integration.mqtt.support.DefaultPahoMessageConverter;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageHandler;

@Configuration
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name="qc.mqtt.enabled", havingValue="true", matchIfMissing=true)
@RequiredArgsConstructor
@Slf4j
public class MqttConfig {

    private final BottleInspectionService inspectionService;
    private final ObjectMapper objectMapper;

    @Value("${mqtt.broker.url}")
    private String brokerUrl;
    @Value("${mqtt.broker.client-id}")
    private String clientId;
    @Value("${mqtt.broker.username}")
    private String username;
    @Value("${mqtt.broker.password}")
    private String password;
    @Value("${mqtt.broker.topic}")
    private String topic;

    @Bean
    public DefaultMqttPahoClientFactory mqttClientFactory() {
        MqttConnectOptions options = new MqttConnectOptions();
        options.setServerURIs(new String[]{brokerUrl});
        options.setUserName(username);
        options.setPassword(password.toCharArray());
        options.setCleanSession(false);
        options.setConnectionTimeout(10);
        options.setKeepAliveInterval(30);
        DefaultMqttPahoClientFactory factory = new DefaultMqttPahoClientFactory();
        factory.setConnectionOptions(options);
        return factory;
    }

    @Bean
    public MessageChannel mqttInputChannel() {
        return new DirectChannel();
    }

    @Bean
    public MessageProducer inbound() {
        MqttPahoMessageDrivenChannelAdapter adapter =
                new MqttPahoMessageDrivenChannelAdapter(clientId, mqttClientFactory(), topic);
        adapter.setCompletionTimeout(5000);
        adapter.setConverter(new DefaultPahoMessageConverter());
        adapter.setQos(1);
        adapter.setManualAcks(true);
        adapter.setOutputChannel(mqttInputChannel());
        return adapter;
    }

    @Bean
    @ServiceActivator(inputChannel = "mqttInputChannel")
    public MessageHandler handler() {
        return message -> {
            try {
                String payload = (String) message.getPayload();
                if (payload.length() > 16384) throw new IllegalArgumentException("MQTT payload too large");
                BottleInspectionDto dto = objectMapper.readValue(payload, BottleInspectionDto.class);
                if (dto.source() != BottleInspectionDto.Source.CAMERA)
                    throw new IllegalArgumentException("MQTT accepts CAMERA events only");
                // This dedicated MQTT callback thread waits for the committed transaction.
                inspectionService.processInspection(dto).block(java.time.Duration.ofSeconds(25));
                var ack = message.getHeaders().get(
                    org.springframework.integration.IntegrationMessageHeaderAccessor.ACKNOWLEDGMENT_CALLBACK,
                    org.springframework.integration.acks.SimpleAcknowledgment.class);
                if (ack != null) ack.acknowledge();
            } catch (Exception e) {
                log.error("MQTT event not acknowledged; producer must retain its durable outbox until application confirmation", e);
                throw new org.springframework.messaging.MessageHandlingException(message, e);
            }
        };
    }
}
