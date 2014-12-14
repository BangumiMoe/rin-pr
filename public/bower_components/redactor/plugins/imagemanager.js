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

				this.modal.createTabber($modal);
				this.modal.addTab(1, 'External', 'active');
				this.modal.addTab(2, 'Upload');
				this.modal.addTab(3, 'Choose');

				$('#redactor-modal-image-droparea').addClass('redactor-tab redactor-tab2').hide();

				var $box1 = $('<div id="redactor-image-url-box" style="overflow: auto;" class="redactor-tab redactor-tab1">'
					+ '<br />'
					+ '<div class=""><p>Image URL:</p><input type="text" name="image-url" /></div>'
					+ '<br />'
					+ '<br />'
					+ '<div class="form-actions" style="float:right"><button id="image-url-insert" class="md-primary md-button md-pink-theme">Insert</button></div></div>');
				$modal.append($box1);

				var $box = $('<div id="redactor-image-manager-box" style="overflow: auto; height: 300px;" class="redactor-tab redactor-tab3">').hide();
				$modal.append($box);

				$('#redactor-image-url-box').find('.form-actions').find('#image-url-insert').click($.proxy(function () {
					var el = $('#redactor-image-url-box').find('input[name=image-url]');
					var imgUrl = el.val();
					if (imgUrl) {
						this.imagemanager.insertUrl(imgUrl);
					} else {
						el.focus();
					}
				}, this));

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


			},
			insert: function(e)
			{
				this.image.insert('<img src="' + $(e.target).attr('src') + '" alt="' + $(e.target).attr('title') + '"/>');
			},
			insertUrl: function(url)
			{
				this.image.insert('<img src="' + url + '"/>');
			}
		};
	};
})(jQuery);