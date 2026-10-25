//protocol.cpp

#include "protocol.hpp"
#include "config.hpp"

//static void iicRecv();

// ดึงข้อมูลจาก Flight Controller เข้าสู่ m_externData
static void iicRecv() {
  const uint8_t FC_ADDR = 0x34;
  const uint8_t LEN = 8;

  Wire.requestFrom(FC_ADDR, LEN);
  uint8_t i = 0;
  while (Wire.available() && i < LEN) {
    pArduino->m_externData[i++] = Wire.read();
  }
  while (i < LEN) {
    pArduino->m_externData[i++] = 0;
  }
}

uint8_t Arduino::m_remoteKey = Arduino::NONE;
char Arduino::m_i2cData[6];
//创建实例
Arduino *pArduino = new Arduino();
//IIC接收与发送中断函数
void Arduino::requestEvent(void) {
  Wire.write(m_i2cData);
}
void Arduino::receiveEvent(int howMany) {
  while (1 < Wire.available()) {  // loop through all but the last
    char c = Wire.read();         // receive byte as a character
                                  // Serial.print(c);      // print the character
  }
  int x = Wire.read();  // receive byte as an integer
  m_remoteKey = x;
  // Serial.println(x); // print the integer
}

//构造函数初始化数据
Arduino::Arduino() {
  //配置IIC读写
  Wire.begin(0x33);
  Wire.onRequest(requestEvent);  // register event
  Wire.onReceive(receiveEvent);
  // Serial.begin(115200);
}

//遥控按键控制功能
//当遥控按下某个键，实现某段功能
void Arduino::keyDo(uint8_t key, void (*func)(void)) {
  if (m_remoteKey != m_prevKey) {
    if (m_remoteKey == Arduino::NONE) {
      m_prevKey = Arduino::NONE;
      return;
    }
    if (key == m_remoteKey) {
      m_prevKey = m_remoteKey;
      delay(1);
      func();
    }
  }
}

void Arduino::take_off(void)  //起飞
{
  m_i2cData[0]++;
  m_i2cData[1] = Arduino::F_ARM;
}
void Arduino::stop_motor(void)  //紧急停止
{
  m_i2cData[0]++;
  m_i2cData[1] = Arduino::F_DISARM;
}
void Arduino::auto_land(void)  //降落
{
  m_i2cData[0]++;
  m_i2cData[1] = Arduino::F_AUTO_LAND;
}
void Arduino::calibration(void)  //校准
{
  m_i2cData[0]++;
  m_i2cData[1] = Arduino::F_CALIBRATION;
}
void Arduino::rotate(void)  //绕机身中心旋转360度
{
  m_i2cData[0]++;
  m_i2cData[1] = Arduino::F_ROTATE;
}
void Arduino::flip(void)  //翻转
{
}
void Arduino::circle_360(void)  //绕机身外的一点为圆心旋转360度
{
  m_i2cData[0]++;
  m_i2cData[1] = Arduino::F_CIRCLE;
}
void Arduino::jump(void)  //上下飞行
{
  m_i2cData[0]++;
  m_i2cData[1] = Arduino::F_JUMP;
}
void Arduino::picture(void)  //拍照
{
  m_i2cData[0]++;
  m_i2cData[1] = Arduino::F_PICTURE;
}
void Arduino::video_begin(void)  //开始录像
{
  m_i2cData[0]++;
  m_i2cData[1] = Arduino::F_VIDEO_BEGIN;
}
void Arduino::video_end(void)  //停止录像
{
  m_i2cData[0]++;
  m_i2cData[1] = Arduino::F_VIDEO_END;
}
void Arduino::jump_end(void)  //停止录像
{
  m_i2cData[0]++;
  m_i2cData[1] = Arduino::F_CLOSE_JUMP;
}
void Arduino::motor(uint8_t num, uint8_t speed)  //电机设置
{
  m_i2cData[0]++;
  m_i2cData[1] = Arduino::F_MOTOR;
  m_i2cData[2] = num;
  m_i2cData[3] = speed;
}
void Arduino::set_pos(int16_t x, int16_t y)  //坐标点设置
{
  m_i2cData[0]++;
  m_i2cData[1] = Arduino::F_POS;
  m_i2cData[2] = (uint16_t)(x & 0xffff);
  m_i2cData[3] = (uint16_t)(x & 0xffff) >> 8;
  m_i2cData[4] = (uint16_t)(y & 0xffff);
  m_i2cData[5] = (uint16_t)(y & 0xffff) >> 8;
}
void Arduino::set_height(uint16_t z)  //高度设置
{
  m_i2cData[0]++;
  m_i2cData[1] = Arduino::F_POS;
  m_i2cData[2] = (uint16_t)(z & 0xffff);
  m_i2cData[3] = (uint16_t)(z & 0xffff) >> 8;
}
void Arduino::set_direction(uint8_t dir, uint8_t speed)  //方向：前后左右上下，速度：缓慢，普通，快速
{
  m_i2cData[0]++;
  m_i2cData[1] = Arduino::F_DIRECTION;
  m_i2cData[2] = dir;
  m_i2cData[3] = speed;
}
void Arduino::set_yaw(uint8_t rotate, uint16_t angle)  //机头旋转角度
{
  m_i2cData[0]++;
  m_i2cData[1] = Arduino::F_YAW_ROTATE;
  m_i2cData[2] = rotate;
  m_i2cData[3] = angle;
  m_i2cData[4] = (angle >> 8);
}

// แล้ว delay((uint32_t)round(distance_cm * MS_PER_CM_FWD));

void Arduino::move_forward_cm(uint16_t distance_cm, uint8_t speed) {
  set_direction(1, speed);  // 1 = forward
  delay(ms_round(distance_cm * MS_PER_CM_FWD));
  poshold(speed);  // เพิ่ม: หยุด/ล็อกตำแหน่งหลังถึงระยะ
}

void Arduino::move_backward_cm(uint16_t distance_cm, uint8_t speed) {
  set_direction(2, speed);  // 2 = backward
  delay(ms_round(distance_cm * MS_PER_CM_BACK));
  poshold(speed);  // เพิ่ม: หยุด/ล็อกตำแหน่งหลังถึงระยะ
}

void Arduino::move_left_cm(uint16_t distance_cm, uint8_t speed) {
  set_direction(3, speed);  // 3 = left
  delay(ms_round(distance_cm * MS_PER_CM_LEFT));
  poshold(speed);  // เพิ่ม: หยุด/ล็อกตำแหน่งหลังถึงระยะ
}

void Arduino::move_right_cm(uint16_t distance_cm, uint8_t speed) {
  set_direction(4, speed);  // 4 = right
  delay(ms_round(distance_cm * MS_PER_CM_RIGHT));
  poshold(speed);  // เพิ่ม: หยุด/ล็อกตำแหน่งหลังถึงระยะ
}

void Arduino::smooth_set_height(uint16_t target_height, uint16_t step, uint16_t delay_ms) {
  static uint16_t current_height = 85;
  if (target_height == current_height) return;

  if (target_height > current_height) {
    for (uint16_t h = current_height + step; h <= target_height; h += step) {
      set_height(h);
      delay(delay_ms);
    }
  } else {
    for (uint16_t h = current_height - step; h >= target_height; h -= step) {
      set_height(h);
      delay(delay_ms);
      if (h <= step) break;
    }
  }
  current_height = target_height;
}

void Arduino::move_forward_fast(uint16_t distance_cm, uint8_t speed) {
  set_direction(1, speed);
  delay(ms_round(distance_cm * MS_PER_CM_FWD_FAST));  // ใช้ ms_round เหมือนกัน
}

// (ถ้าคุณมีฟังก์ชันนี้แล้วด้านล่าง ให้ลบทิ้งอันที่ซ้ำ)
void Arduino::move_backward_fast(uint16_t distance_cm, uint8_t speed) {
  set_direction(2, speed);
  delay(ms_round(distance_cm * MS_PER_CM_BACK_FAST));
}

// ---- FAST moves เพิ่มใหม่ให้ครบทิศ ----
void Arduino::move_right_fast(uint16_t distance_cm, uint8_t speed) {
  set_direction(4, speed);  // right
  delay(ms_round(distance_cm * MS_PER_CM_RIGHT_FAST));
}

void Arduino::move_left_fast(uint16_t distance_cm, uint8_t speed) {
  set_direction(3, speed);  // left
  delay(ms_round(distance_cm * MS_PER_CM_LEFT_FAST));
}

// poll() เอาไว้ดึงข้อมูลจาก I2C ให้สดใหม่ (รวมถึง m_externData)
void Arduino::poll() {
  iicRecv();  // ดึงค่า externData จาก FC ให้สดใหม่
}

// ดึงความสูงจาก buffer m_externData (ถ้าต้องการเรียกจากที่อื่น)
uint16_t Arduino::get_height_cm() const {
  return (uint16_t)m_externData[0] | ((uint16_t)m_externData[1] << 8);
}

//Inewgent
void Arduino::poshold(uint8_t speed) {
  set_direction(7, speed);
}

void Arduino::poshold_heights(uint16_t height, uint8_t speed) {
  set_height(height);
  set_direction(7, speed);
}

void Arduino::set_heights(uint16_t height) {
  set_height(height);
}

void Arduino::up(int16_t speed, int16_t time) {
    set_direction(5, speed);
    delay(time);
}

void Arduino::down(int16_t speed, int16_t time) {
    set_direction(6, speed);
    delay(time);
}

void Arduino::calibrateAndDelay(unsigned long ms) {
  calibration();
  delay(ms);
}