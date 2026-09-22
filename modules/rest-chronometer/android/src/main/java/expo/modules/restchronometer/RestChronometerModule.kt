package expo.modules.restchronometer

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.SystemClock
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * O cronômetro de descanso na barra de notificação.
 *
 * O Android sabe tiquetaquear um número numa notificação sem o app estar vivo:
 * um widget `Chronometer` dentro de `RemoteViews` é desenhado e contado pela
 * SystemUI. É isso que faz o número continuar correndo com a tela travada e o
 * app fechado — algo que nenhum `setInterval` de JavaScript alcança, porque o
 * JavaScript simplesmente para.
 *
 * Este módulo existe porque `expo-notifications` não expõe essa chamada. Fora
 * do Android ele não é compilado, e o JavaScript cai numa notificação comum
 * com o horário de término escrito.
 */
class RestChronometerModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("RestChronometer")

    /**
     * Publica o cronômetro correndo. `startedAt` é relógio de parede, em ms —
     * a conversão para a base do Chronometer é feita aqui dentro.
     */
    Function("start") { startedAt: Double, title: String, body: String, color: String ->
      post(startedAt.toLong(), title, body, color, ticking = true)
    }

    /**
     * O mesmo desenho com o número parado. Pausado, a SystemUI não pode seguir
     * contando: ela não tem como saber que o descanso parou.
     */
    Function("freeze") { elapsed: Double, title: String, body: String, color: String ->
      post(System.currentTimeMillis() - elapsed.toLong() * 1000, title, body, color, ticking = false)
    }

    Function<Unit>("stop") {
      NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
    }
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
   * Ícone da barra de status. O Android desenha só a silhueta, então um ícone
   * colorido vira um borrão branco — daí procurar primeiro o monocromático que
   * o expo-notifications gera.
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

    val tint = try {
      Color.parseColor(color)
    } catch (invalid: IllegalArgumentException) {
      Color.parseColor("#2E6B4E")
    }

    val content = RemoteViews(context.packageName, R.layout.rest_chronometer)
    content.setTextViewText(R.id.rest_title, title)
    content.setTextViewText(R.id.rest_body, body)
    content.setTextColor(R.id.rest_clock, tint)

    // O Chronometer conta na base do `elapsedRealtime`, não na do relógio de
    // parede. Sem esta conversão o número sairia com anos de diferença.
    val base = SystemClock.elapsedRealtime() - (System.currentTimeMillis() - startedAt)
    content.setChronometer(R.id.rest_clock, base, null, ticking)

    val builder =
      NotificationCompat.Builder(context, CHANNEL_ID)
        .setSmallIcon(smallIcon())
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
        .setStyle(NotificationCompat.DecoratedCustomViewStyle())
        .setCustomContentView(content)
        .setCustomBigContentView(content)
        // Os títulos também vão pelo caminho comum: é o que a tela de bloqueio
        // e os relógios de pulso leem quando não sabem desenhar RemoteViews.
        .setContentTitle(title)
        .setContentText(body)
        .setContentIntent(openApp())

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
