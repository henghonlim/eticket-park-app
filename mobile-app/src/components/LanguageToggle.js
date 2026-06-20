import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import i18nConfig from '../i18n';

export default function LanguageToggle() {
  const [currentLang, setCurrentLang] = useState(i18nConfig.language || 'bm');

  useEffect(() => {
    const handleLangChange = (lng) => setCurrentLang(lng);
    i18nConfig.on('languageChanged', handleLangChange);
    
    return () => {
      i18nConfig.off('languageChanged', handleLangChange);
    };
  }, []);

  const toggleLanguage = () => {
    const nextLang = currentLang === 'bm' ? 'en' : 'bm';
    setCurrentLang(nextLang);
    i18nConfig.changeLanguage(nextLang);
  };

  return (
    // activeOpacity={0.7} 可以在点击时有一个变淡的反馈效果
    <TouchableOpacity style={styles.container} onPress={toggleLanguage} activeOpacity={0.7}>
      {/* 加上一个小地球图标，让用户一眼看出这是语言选项 */}
      <Ionicons name="globe-outline" size={16} color="#0077B6" style={styles.icon} />
      
      {/* 动态显示当前语言 */}
      <Text style={styles.text}>
        {currentLang === 'bm' ? 'BM' : 'EN'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF', // 极淡的蓝色背景，看起来更现代
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#0077B6',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  icon: {
    marginRight: 6, // 图标和文字的间距
  },
  text: {
    fontSize: 14,
    color: '#0077B6',
    fontWeight: '900', // 加粗字体让它更显眼
    letterSpacing: 0.5,
  }
});