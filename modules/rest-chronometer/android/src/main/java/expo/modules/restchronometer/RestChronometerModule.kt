package expo.modules.restchronometer

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * O cronômetro de descanso na barra de notificação.
 *
 * `setUsesChronometer` manda a SystemUI contar o tempo a partir do instante em
 * `setWhen`. Quem desenha e conta é ela, não o app: por isso o número continua
 * correndo com a tela travada e o app fechado, coisa que nenhum `setInterval`
 * de JavaScript alcança — o JavaScript simplesmente para.
 *
 * Este módulo existe porque `expo-notifications` não expõe essa chamada. Ele
 * não declara recurso nenhum de propósito: um layout próprio precisaria dos
 * estilos de texto do `androidx.core` para acompanhar tema claro e escuro, e
 * essa dependência de recursos é justamente o que não se quer numa peça que só
 * pode ser testada compilando no servidor.
 */
class RestChronometerModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("RestChronometer")

    /** Publica o cronômetro correndo. `startedAt` é relógio de parede, em ms. */
    Function("start") { startedAt: Double, title: String, body: String, color: String ->
      post(startedAt.toLong(), title, body, color, ticking = true)
    }

    /**
     * A mesma notificação com o número parado. Pausado, a SystemUI não pode
     * seguir contando: ela não tem como saber que o descanso parou.
     */
    Function("freeze") { elapsed: Double, title: String, body: String, color: String ->
      post(0L, title, "$body · parado em ${mmss(elapsed.toInt())}", color, ticking = false)
    }

    Function("stop") { NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID) }
  }

  private fun mmss(seconds: Int): String {
    val safe = if (seconds < 0) 0 else seconds
    return "${safe / 60}:${(safe % 60).toString().padStart(2, '0')}"
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return

    // Silencioso e de baixa importância: esta notificação fica de pé o descanso
    // inteiro. Quem faz barulho é o aviso de fim, que vive noutro canal.
    val channel =
      NotificationChannel(CHANNEL_ID, "Cronômetro de descanso", NotificationManager.IMPORTANCE_LOW)
    channel.description = "O tempo de descanso correndo na barra."
    channel.setShowBadge(false)
    channel.enableVibration(false)
    channel.setSound(null, null)
    manager.createNotificationChannel(channel)
  }

  /**
   * Tocar traz o app de volta, na tela em que ele estava.
   *
   * O intent de abertura do pacote, e não um `notegym://` qualquer: um esquema
   * apontando para uma rota que não existe faria o expo-router abrir a tela de
   * rota não encontrada.
   */
  private fun openApp(): PendingIntent {
    val intent =
      context.packageManager.getLaunchIntentForPackage(context.packageName)
        ?: Intent(Intent.ACTION_MAIN).setPackage(context.packageName)
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    return PendingIntent.getActivity(
      context,
      0,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  /**
   * Ícone da barra de status. O Android desenha só a silhueta, então procura
   * primeiro o monocromático que o expo-notifications gera.
   */
  private fun smallIcon(): Int {
    for (name in listOf("notification_icon", "ic_notification")) {
      val id = context.resources.getIdentifier(name, "drawable", context.packageName)
      if (id != 0) return id
    }
    return context.applicationInfo.icon
  }

  private fun post(startedAt: Long, title: String, body: String, color: String, ticking: Boolean) {
    ensureChannel()

    val tint =
      try {
        Color.parseColor(color)
      } catch (invalid: IllegalArgumentException) {
        Color.parseColor("#2E6B4E")
      }

    val builder =
      NotificationCompat.Builder(context, CHANNEL_ID)
        .setSmallIcon(smallIcon())
        .setContentTitle(title)
        .setContentText(body)
        .setColor(tint)
        .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
        .setPriority(NotificationCompat.PRIORITY_LOW)
        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
        // De pé até o descanso acabar: um cronômetro que sai com um deslize
        // mente sobre o que ainda está correndo.
        .setOngoing(true)
        .setAutoCancel(false)
        .setOnlyAlertOnce(true)
        .setSilent(true)
        .setContentIntent(openApp())

    if (ticking) {
      builder.setUsesChronometer(true).setWhen(startedAt).setShowWhen(true)
    } else {
      builder.setUsesChronometer(false).setShowWhen(false)
    }

    try {
      NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, builder.build())
    } catch (denied: SecurityException) {
      // Permissão de notificação negada. O cronômetro da tela continua valendo,
      // então não há o que fazer além de não estourar.
    }
  }

  companion object {
    private const val CHANNEL_ID = "rest-chronometer"
    private const val NOTIFICATION_ID = 7341
  }
}
