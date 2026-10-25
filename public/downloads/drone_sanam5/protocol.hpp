#ifndef _PROTOCOL_H_
#define _PROTOCOL_H_

#include <Arduino.h>
#include <Wire.h>

#define PC1 A1
#define PC0 A0
#define PB1 9
#define PB2 10
#define PB3 11
#define PD3 3
#define PORT1 PB2
#define PORT2 PB1
#define PORT3 PB3
#define PORT4 PD3
#define PORT5 PC1
#define PORT6 PC0

class Arduino {
private:
	// static uint8_t m_i2cData[6];
	static char m_i2cData[6];

	enum _FUNCTION_SEND {
		F_NONE,
		F_ARM = 1,
		F_DISARM,
		F_AUTO_LAND,
		F_CALIBRATION,
		F_ROTATE,
		F_FLIP,
		F_SPEED,
		F_CIRCLE,
		F_JUMP,
		F_MOTOR = 12,
		F_POS = 14,
		F_DIRECTION,
		F_YAW_ROTATE,
		F_PICTURE = 31,
		F_VIDEO_BEGIN,
		F_VIDEO_END,
		F_CLOSE_JUMP = 37,
	};

	static void requestEvent(void);
	static void receiveEvent(int howMany);

public:
	enum _FUNCTION_READ {
		NONE = 0,
		KEY_1,
		KEY_2,
		KEY_3,
		KEY_4,
		KEY_5,
		KEY_6,
		KEY_7,
		KEY_8,
		KEY_9,
		KEY_10,
		KEY_11,
		KEY_12,
		KEY_13,
		KEY_14,
		RESET_INDEX,
	};

	uint8_t m_prevKey = NONE;
	static uint8_t m_remoteKey;
	uint8_t m_externData[8] = { 0 };

	Arduino(void);

	void take_off(void);
	void stop_motor(void);
	void auto_land(void);
	void calibration(void);
	void calibrateAndDelay(unsigned long ms);
	void rotate(void);
	void flip(void);
	void circle_360(void);
	void jump(void);
	void picture(void);
	void video_begin(void);
	void video_end(void);
	void jump_end(void);
	void motor(uint8_t num, uint8_t speed);
	void set_pos(int16_t x, int16_t y);
	void set_height(uint16_t z);
	void set_direction(uint8_t dir, uint8_t speed);
	void set_yaw(uint8_t rotate, uint16_t angle);

	void keyDo(uint8_t, void (*)(void));

	void move_forward_cm(uint16_t distance_cm, uint8_t speed = 2);
	void move_backward_cm(uint16_t distance_cm, uint8_t speed = 2);
	void move_left_cm(uint16_t distance_cm, uint8_t speed = 2);
	void move_right_cm(uint16_t distance_cm, uint8_t speed = 2);
	void smooth_set_height(uint16_t target_height, uint16_t step = 10, uint16_t delay_ms = 200);

	void move_forward_fast(uint16_t distance_cm, uint8_t speed = 3);
	void move_backward_fast(uint16_t distance_cm, uint8_t speed = 3);
	void move_left_fast(uint16_t distance_cm, uint8_t speed = 3);
	void move_right_fast(uint16_t distance_cm, uint8_t speed = 3);

	void poll();
	uint16_t get_height_cm() const;
	void up(int16_t speed = 2, int16_t time = 500);
	void down(int16_t speed = 2, int16_t time = 500);
	void poshold(uint8_t speed = 2);
	void poshold_heights(uint16_t height, uint8_t speed = 2);
	void set_heights(uint16_t height);
};

extern Arduino *pArduino;

#endif
