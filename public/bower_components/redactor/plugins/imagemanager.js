if (!RedactorPlugins) var RedactorPlugins = {};

(function($)
{
	RedactorPlugins.imagemanager = function()
	{
		return {
			init: function()
			{
				if (!this.opts.imageManagerJson) return;

				this.modal.addCallback('image', this.imagemanager.load);
			},
			load: function()
			{
				var $modal = this.modal.getModal();
				var enableUpload = this.opts.imageEnableUpload;

				this.modal.createTabber($modal);
				this.modal.addTab(1, 'External', 'active');
				if (enableUpload) {
					this.modal.addTab(2, 'Upload');
					this.modal.addTab(3, 'Choose');
				}

				$('#redactor-modal-image-droparea').addClass('redactor-tab redactor-tab2').hide();

				var $box1 = $('<div id="redactor-image-url-box" style="overflow: auto;" class="redactor-tab redactor-tab1">'
					+ '<br />'
					+ '<div class=""><p>Image URL:</p><input type="text" name="image-url" /></div>'
					+ '<div class="image-size"><span>Image Size: </span><input type="text" name="image-width" /><span>x</span><input type="text" name="image-height" /><span> </span><input type="checkbox" name="image-aspect-lock" checked="checked" /><span>Lock</span></div>'
					+ '<br />'
					+ '<br />'
					+ '<div class="form-actions" style="float:right"><button id="image-url-insert" class="md-primary md-button md-pink-theme">Insert</button></div></div>');
				$modal.append($box1);

				var $box = $('<div id="redactor-image-manager-box" style="overflow: auto; height: 300px;" class="redactor-tab redactor-tab3">').hide();
				$modal.append($box);

				var $urlbox = $('#redactor-image-url-box');
				var imgSize = {w: 0, h: 0, set: false};
				$urlbox.find('.form-actions').find('#image-url-insert').click($.proxy(function () {
					var box = $('#redactor-image-url-box');
					var el = box.find('input[name=image-url]');
					var imgUrl = el.val();
					if (imgUrl) {
						var w = box.find('input[name=image-width]').val();
						var h = box.find('input[name=image-height]').val();
						this.imagemanager.insertUrl(imgUrl, w, h);
					} else {
						el.focus();
					}
				}, this));

				$urlbox.find('input[name=image-url]').blur($.proxy(function () {
					var box = $('#redactor-image-url-box');
					var el = box.find('input[name=image-url]');
					var imgUrl = el.val();
					if (imgUrl) {
						var img = new Image(); 
						imgSize.set = false;
						img.onload = function () {
							imgSize.w = this.width;
							imgSize.h = this.height;
							imgSize.set = true;
							box.find('input[name=image-width]').val(this.width);
							box.find('input[name=image-height]').val(this.height);
						};
						img.src = imgUrl;
					}
				}, this));

				$urlbox.find('input[name=image-width]').change($.proxy(function () {
					var box = $('#redactor-image-url-box');
					var el = box.find('input[name=image-aspect-lock]');
					if (imgSize.set && el.prop('checked')) {
						var w = box.find('input[name=image-width]').val();
						var h = Math.round(w * imgSize.h / imgSize.w);
						box.find('input[name=image-height]').val(h);
					}
				}, this));

				$urlbox.find('input[name=image-height]').change($.proxy(function () {
					var box = $('#redactor-image-url-box');
					var el = box.find('input[name=image-aspect-lock]');
					if (imgSize.set && el.prop('checked')) {
						var h = box.find('input[name=image-height]').val();
						var w = Math.round(h * imgSize.w / imgSize.h);
						box.find('input[name=image-width]').val(w);
					}
				}, this));

				$urlbox.find('input[name=image-aspect-lock]').click($.proxy(function () {
					var box = $('#redactor-image-url-box');
					var el = box.find('input[name=image-aspect-lock]');
					if (imgSize.set && el.prop('checked')) {
						box.find('input[name=image-width]').val(imgSize.w);
						box.find('input[name=image-height]').val(imgSize.h);
					}
				}, this));

				if (enableUpload) {
					$.ajax({
					  dataType: "json",
					  cache: false,
					  url: this.opts.imageManagerJson,
					  success: $.proxy(function(data)
						{
							$.each(data, $.proxy(function(key, val)
							{
								// title
								var thumbtitle = '';
								if (typeof val.filename !== 'undefined') thumbtitle = val.filename;
								//val.image
								var img = $('<img src="/' + val.savepath + '" rel="' + '' + '" title="' + thumbtitle + '" style="width: 100px; height: 75px; cursor: pointer;" />');
								$('#redactor-image-manager-box').append(img);
								$(img).click($.proxy(this.imagemanager.insert, this));

							}, this));


						}, this)
					});
				}

			},
			insert: function(e)
			{
				this.image.insert('<img src="' + $(e.target).attr('src') + '" alt="' + $(e.target).attr('title') + '"/>');
			},
			insertUrl: function(url, width, height)
			{
				var imgHtml = '<img src="' + url + '"';
				if (width || height) {
					imgHtml += ' style="';
					if (width) {
						imgHtml += 'width:' + width + 'px;'
					}
					if (height) {
					  imgHtml += 'height:' + height + 'px;';
				  }
				  imgHtml += '"';
				}
				imgHtml += '/>';
				this.image.insert(imgHtml);
			}
		};
	};
})(jQuery);