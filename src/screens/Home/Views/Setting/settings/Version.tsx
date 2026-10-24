import { memo } from 'react'
import { StyleSheet, View } from 'react-native'

import Section from '../components/Section'
import SubTitle from '../components/SubTitle'
import Button from '../components/Button'

import { useI18n } from '@/lang'
import Text from '@/components/common/Text'
import { showModal } from '@/core/version'

const currentVer = process.versions.app
export default memo(() => {
  const t = useI18n()
  const handleOpenVersionModal = () => {
    showModal()
  }

  return (
    <Section title={t('setting_version')}>
      <SubTitle title={t('version_label_current_ver')}>
        <View style={styles.desc}>
          <Text size={14}>{currentVer}</Text>
        </View>
        <View style={styles.btn}>
          <Button onPress={handleOpenVersionModal}>{t('setting_version_show_ver_modal')}</Button>
        </View>
      </SubTitle>
    </Section>
  )
})

const styles = StyleSheet.create({
  desc: {
    marginBottom: 8,
  },
  btn: {
    flexDirection: 'row',
  },
})
